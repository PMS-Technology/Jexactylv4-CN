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
use Everest\Services\AI\Stream\OllamaStreamDecoder;

/**
 * Ollama native chat protocol (/api/chat), including its NDJSON stream.
 */
class OllamaChatAdapter extends AbstractAdapter
{
    public function buildRequest(UnifiedRequest $request): AIHttpRequest
    {
        $body = [
            'model' => $this->model($request),
            'messages' => $this->messages($request),
            'stream' => $request->stream,
        ];

        $options = array_filter([
            'temperature' => $request->temperature,
            'num_predict' => $request->maxTokens,
        ], fn ($value) => !is_null($value));

        $body['options'] = $options;

        if ($request->tools !== []) {
            $body['tools'] = array_map(fn (AITool $tool) => [
                'type' => 'function',
                'function' => [
                    'name' => $tool->name,
                    'description' => $tool->description,
                    'parameters' => $tool->parameters ?: ['type' => 'object', 'properties' => new \stdClass()],
                ],
            ], $request->tools);
        }

        return $this->buildHttpRequest(
            'POST',
            $this->url('chat', $request),
            $body,
            $request->stream,
            'ndjson',
        );
    }

    protected function messages(UnifiedRequest $request): array
    {
        $messages = [];

        if ($request->system) {
            $messages[] = ['role' => 'system', 'content' => $request->system];
        }

        foreach ($request->messages as $message) {
            $messages[] = $this->message($message);
        }

        return $messages;
    }

    protected function message(AIMessage $message): array
    {
        $payload = [
            'role' => $message->role === 'tool' ? 'tool' : $message->role,
            'content' => $message->content,
        ];

        if ($message->role === 'tool') {
            $payload['tool_name'] = $message->name ?: $message->toolCallId;
        }

        if ($message->images !== []) {
            $images = [];
            foreach ($message->images as $image) {
                if (!empty($image['data'])) {
                    $images[] = (string) $image['data'];
                }
            }
            if ($images !== []) {
                $payload['images'] = $images;
            }
        }

        if ($message->toolCalls !== []) {
            $payload['tool_calls'] = array_map(fn (array $call) => [
                'function' => [
                    'name' => (string) ($call['name'] ?? ''),
                    'arguments' => $call['arguments'] ?? new \stdClass(),
                ],
            ], $message->toolCalls);
        }

        return $payload;
    }

    public function parseResponse(AIUpstreamResponse $response): UnifiedResponse
    {
        $data = $response->json();
        $message = is_array($data['message'] ?? null) ? $data['message'] : [];

        $toolCalls = [];
        foreach ((array) ($message['tool_calls'] ?? []) as $index => $call) {
            $function = is_array($call['function'] ?? null) ? $call['function'] : [];
            $toolCalls[] = [
                'id' => (string) ($call['id'] ?? 'call_' . $index),
                'name' => (string) ($function['name'] ?? ''),
                'arguments' => DataAccess::decodeJson($function['arguments'] ?? []),
            ];
        }

        return new UnifiedResponse(
            text: (string) ($message['content'] ?? ''),
            toolCalls: $toolCalls,
            finishReason: ($data['done'] ?? true) ? ((string) ($data['done_reason'] ?? 'stop') ?: 'stop') : 'stop',
            usage: DataAccess::normalizeUsage([
                'prompt_eval_count' => $data['prompt_eval_count'] ?? null,
                'eval_count' => $data['eval_count'] ?? null,
            ]),
            raw: $data,
            model: is_string($data['model'] ?? null) ? $data['model'] : null,
            id: null,
            provider: $this->provider->id,
        );
    }

    public function createStreamDecoder(): StreamDecoder
    {
        return new OllamaStreamDecoder($this->provider);
    }
}
