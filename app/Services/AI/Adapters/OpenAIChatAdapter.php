<?php

namespace Everest\Services\AI\Adapters;

use Everest\Services\AI\Data\AITool;
use Everest\Services\AI\Data\AIMessage;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Exceptions\AIProviderException;
use Everest\Services\AI\Stream\OpenAIChatStreamDecoder;

/**
 * OpenAI chat completions protocol. Also covers OpenRouter, Command Code,
 * OpenCode fallbacks and GitHub Copilot chat, which use the same wire format.
 */
class OpenAIChatAdapter extends AbstractAdapter
{
    public function buildRequest(UnifiedRequest $request): AIHttpRequest
    {
        $mapping = $this->provider->mapping;
        $body = [
            'model' => $this->model($request),
            'messages' => $this->messages($request),
            'stream' => $request->stream,
        ];

        $maxTokensKey = (string) ($mapping['max_tokens_key'] ?? 'max_tokens');
        $body[$maxTokensKey] = $request->maxTokens;

        if ($request->temperature !== null && ($mapping['send_temperature'] ?? true)) {
            $body['temperature'] = $request->temperature;
        }

        if ($request->tools !== []) {
            $body['tools'] = array_map(
                fn (AITool $tool) => [
                    'type' => 'function',
                    'function' => [
                        'name' => $tool->name,
                        'description' => $tool->description,
                        'parameters' => $tool->parameters ?: ['type' => 'object', 'properties' => new \stdClass()],
                    ],
                ],
                $request->tools
            );
        }

        if ($request->toolChoice !== null) {
            $body['tool_choice'] = $this->toolChoice($request->toolChoice);
        }

        foreach ((array) ($mapping['extra_body'] ?? []) as $key => $value) {
            $body[$key] = $value;
        }

        return $this->buildHttpRequest(
            'POST',
            $this->url($request->stream && isset($this->provider->paths['stream']) ? 'stream' : 'chat', $request),
            $this->compact($body),
            $request->stream,
        );
    }

    protected function toolChoice(string $choice): string|array
    {
        if (str_starts_with($choice, 'function:')) {
            return ['type' => 'function', 'function' => ['name' => substr($choice, 9)]];
        }
        if (str_starts_with($choice, 'tool:')) {
            return ['type' => 'function', 'function' => ['name' => substr($choice, 5)]];
        }

        return $choice;
    }

    protected function messages(UnifiedRequest $request): array
    {
        $mapping = $this->provider->mapping;
        $messages = [];

        if ($request->system) {
            $messages[] = [
                'role' => (string) ($mapping['system_role'] ?? 'system'),
                'content' => $request->system,
            ];
        }

        foreach ($request->messages as $message) {
            $messages[] = $this->message($message);
        }

        return $messages;
    }

    protected function message(AIMessage $message): array
    {
        $mapping = $this->provider->mapping;

        if ($message->role === 'tool') {
            return [
                'role' => 'tool',
                'tool_call_id' => $message->toolCallId,
                'content' => $message->content,
            ];
        }

        $payload = ['role' => $message->role];

        if ($message->images !== [] && ($mapping['content_parts'] ?? true)) {
            $parts = [];
            if ($message->content !== '') {
                $parts[] = ['type' => 'text', 'text' => $message->content];
            }
            foreach ($message->images as $image) {
                $url = $this->imageUrl($image);
                if ($url !== null) {
                    $parts[] = ['type' => 'image_url', 'image_url' => ['url' => $url]];
                }
            }
            $payload['content'] = $parts;
        } else {
            $payload['content'] = $message->content;
        }

        if ($message->toolCalls !== []) {
            $payload['tool_calls'] = array_map(fn (array $call) => [
                'id' => (string) ($call['id'] ?? ''),
                'type' => 'function',
                'function' => [
                    'name' => (string) ($call['name'] ?? ''),
                    'arguments' => json_encode($call['arguments'] ?? new \stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ],
            ], $message->toolCalls);
        }

        if ($message->name) {
            $payload['name'] = $message->name;
        }

        return $payload;
    }

    protected function imageUrl(array $image): ?string
    {
        if (!empty($image['url'])) {
            return (string) $image['url'];
        }
        if (!empty($image['data'])) {
            return sprintf(
                'data:%s;base64,%s',
                $image['media_type'] ?? 'image/png',
                $image['data']
            );
        }

        return null;
    }

    public function parseResponse(AIUpstreamResponse $response): UnifiedResponse
    {
        $data = $response->json();
        $mapping = $this->provider->mapping;

        if (isset($data['error']) && empty($data['choices'])) {
            throw new AIProviderException(status: $response->status >= 400 ? $response->status : 502, body: $response->body, contentType: $response->contentType(), provider: $this->provider->id);
        }
        $message = DataAccess::get($data, $mapping['response_message_path'] ?? 'choices.0.message', []);
        $message = is_array($message) ? $message : [];

        $textPath = $mapping['response_text_path'] ?? null;
        $textValue = $textPath
            ? (DataAccess::get($message, $textPath) ?? DataAccess::get($data, $textPath))
            : DataAccess::get($message, 'content', DataAccess::get($data, 'choices.0.text', ''));
        $text = DataAccess::text($textValue);

        $toolPath = $mapping['response_tool_calls_path'] ?? 'tool_calls';
        $rawToolCalls = DataAccess::get($message, $toolPath, DataAccess::get($data, $toolPath, []));

        $toolCalls = [];
        foreach ((array) $rawToolCalls as $index => $call) {
            $function = is_array($call['function'] ?? null) ? $call['function'] : [];
            $toolCalls[] = [
                'id' => (string) ($call['id'] ?? 'call_' . $index),
                'name' => (string) ($function['name'] ?? ''),
                'arguments' => DataAccess::decodeJson($function['arguments'] ?? []),
            ];
        }

        $finish = DataAccess::get($data, $mapping['response_finish_path'] ?? 'choices.0.finish_reason', 'stop');

        return new UnifiedResponse(
            text: $text,
            toolCalls: $toolCalls,
            finishReason: is_string($finish) && $finish !== '' ? $finish : 'stop',
            usage: DataAccess::normalizeUsage((array) ($data['usage'] ?? []), (array) ($mapping['usage'] ?? [])),
            raw: $data,
            model: is_string($data['model'] ?? null) ? $data['model'] : null,
            id: is_string($data['id'] ?? null) ? $data['id'] : null,
            provider: $this->provider->id,
        );
    }

    public function createStreamDecoder(): StreamDecoder
    {
        return new OpenAIChatStreamDecoder($this->provider);
    }
}
