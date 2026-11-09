<?php

namespace Everest\Services\AI\Adapters;

use Everest\Services\AI\Data\AITool;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Exceptions\AIProviderException;
use Everest\Services\AI\Stream\OpenAIResponsesStreamDecoder;

/**
 * OpenAI Responses protocol, shared by the OpenAI Responses API, the Codex
 * backend, xAI Grok Build and GitHub Copilot's /responses endpoint.
 */
class OpenAIResponsesAdapter extends AbstractAdapter
{
    public function buildRequest(UnifiedRequest $request): AIHttpRequest
    {
        $mapping = $this->provider->mapping;
        $body = [
            'model' => $this->model($request),
            'input' => $this->input($request),
            'stream' => $request->stream,
        ];

        if ($request->system) {
            if ($mapping['system_as_input'] ?? false) {
                array_unshift($body['input'], [
                    'role' => (string) ($mapping['system_role'] ?? 'system'),
                    'content' => [['type' => 'input_text', 'text' => $request->system]],
                ]);
            } else {
                $body['instructions'] = $request->system;
            }
        }

        $body[(string) ($mapping['max_tokens_key'] ?? 'max_output_tokens')] = $request->maxTokens;

        if ($request->temperature !== null && ($mapping['send_temperature'] ?? true)) {
            $body['temperature'] = $request->temperature;
        }

        if ($request->tools !== []) {
            $body['tools'] = array_map(fn (AITool $tool) => [
                'type' => 'function',
                'name' => $tool->name,
                'description' => $tool->description,
                'parameters' => $tool->parameters ?: ['type' => 'object', 'properties' => new \stdClass()],
            ], $request->tools);
        }

        if ($request->toolChoice !== null) {
            $body['tool_choice'] = $this->toolChoice($request->toolChoice);
        }

        foreach ((array) ($mapping['extra_body'] ?? []) as $key => $value) {
            $body[$key] = $value;
        }

        if (array_key_exists('store', $this->provider->options)) {
            $body['store'] = (bool) $this->provider->options['store'];
        }

        return $this->buildHttpRequest(
            'POST',
            $this->url($request->stream && isset($this->provider->paths['stream']) ? 'stream' : 'responses', $request),
            $this->compact($body),
            $request->stream,
        );
    }

    protected function input(UnifiedRequest $request): array
    {
        $input = [];

        foreach ($request->messages as $message) {
            if ($message->role === 'tool') {
                $input[] = [
                    'type' => 'function_call_output',
                    'call_id' => $message->toolCallId,
                    'output' => $message->content,
                ];
                continue;
            }

            if ($message->role === 'assistant') {
                if ($message->content !== '') {
                    $input[] = [
                        'role' => 'assistant',
                        'content' => [['type' => 'output_text', 'text' => $message->content]],
                    ];
                }
                foreach ($message->toolCalls as $call) {
                    $input[] = [
                        'type' => 'function_call',
                        'call_id' => (string) ($call['id'] ?? ''),
                        'name' => (string) ($call['name'] ?? ''),
                        'arguments' => json_encode($call['arguments'] ?? new \stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ];
                }
                continue;
            }

            $parts = [];
            if ($message->content !== '') {
                $parts[] = ['type' => 'input_text', 'text' => $message->content];
            }
            foreach ($message->images as $image) {
                $url = $this->imageUrl($image);
                if ($url !== null) {
                    $parts[] = ['type' => 'input_image', 'image_url' => $url];
                }
            }

            $input[] = [
                'role' => $message->role === 'system' ? 'system' : 'user',
                'content' => $parts ?: [['type' => 'input_text', 'text' => '']],
            ];
        }

        return $input;
    }

    protected function imageUrl(array $image): ?string
    {
        if (!empty($image['url'])) {
            return (string) $image['url'];
        }
        if (!empty($image['data'])) {
            return sprintf('data:%s;base64,%s', $image['media_type'] ?? 'image/png', $image['data']);
        }

        return null;
    }

    protected function toolChoice(string $choice): string|array
    {
        if (str_starts_with($choice, 'function:')) {
            return ['type' => 'function', 'name' => substr($choice, 9)];
        }

        return $choice;
    }

    public function parseResponse(AIUpstreamResponse $response): UnifiedResponse
    {
        $data = $response->json();
        $mapping = $this->provider->mapping;

        if (isset($data['error']) && empty($data['output'])) {
            throw new AIProviderException(status: $response->status >= 400 ? $response->status : 502, body: $response->body, contentType: $response->contentType(), provider: $this->provider->id);
        }

        $text = DataAccess::get($data, $mapping['response_text_path'] ?? 'output_text', null);
        $text = is_string($text) ? $text : null;
        $toolCalls = [];
        $parts = [];

        foreach ((array) ($data['output'] ?? []) as $index => $item) {
            if (!is_array($item)) {
                continue;
            }

            $type = $item['type'] ?? null;
            if ($type === 'message') {
                $messageText = DataAccess::text($item['content'] ?? []);
                if ($messageText !== '') {
                    $parts[] = $messageText;
                }
            } elseif ($type === 'function_call') {
                $toolCalls[] = [
                    'id' => (string) ($item['call_id'] ?? $item['id'] ?? 'call_' . $index),
                    'name' => (string) ($item['name'] ?? ''),
                    'arguments' => DataAccess::decodeJson($item['arguments'] ?? []),
                ];
            }
        }

        if ($text === null || $text === '') {
            $text = implode('', $parts);
        }

        $status = (string) ($data['status'] ?? '');
        $finish = DataAccess::get($data, $mapping['response_finish_path'] ?? 'incomplete_details.reason', null);
        if (!$finish) {
            $finish = match ($status) {
                'incomplete' => 'length',
                'failed', 'cancelled' => 'error',
                default => 'stop',
            };
        }

        return new UnifiedResponse(
            text: $text,
            toolCalls: $toolCalls,
            finishReason: is_string($finish) ? $finish : 'stop',
            usage: DataAccess::normalizeUsage((array) ($data['usage'] ?? []), (array) ($mapping['usage'] ?? [])),
            raw: $data,
            model: is_string($data['model'] ?? null) ? $data['model'] : null,
            id: is_string($data['id'] ?? null) ? $data['id'] : null,
            provider: $this->provider->id,
        );
    }

    public function createStreamDecoder(): StreamDecoder
    {
        return new OpenAIResponsesStreamDecoder($this->provider);
    }
}
