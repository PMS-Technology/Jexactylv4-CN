<?php

namespace Everest\Services\AI\Adapters;

use Everest\Services\AI\Data\AITool;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Stream\AnthropicStreamDecoder;
use Everest\Services\AI\Exceptions\AIProviderException;

/**
 * Anthropic Messages protocol, used by the Anthropic API and Claude Code.
 */
class AnthropicMessagesAdapter extends AbstractAdapter
{
    public function buildRequest(UnifiedRequest $request): AIHttpRequest
    {
        $body = [
            'model' => $this->model($request),
            'max_tokens' => $request->maxTokens,
            'messages' => $this->messages($request),
            'stream' => $request->stream,
        ];

        if ($request->system) {
            $body['system'] = $request->system;
        }

        if ($request->temperature !== null) {
            $body['temperature'] = $request->temperature;
        }

        if ($request->tools !== []) {
            $body['tools'] = array_map(fn (AITool $tool) => [
                'name' => $tool->name,
                'description' => $tool->description,
                'input_schema' => $tool->parameters ?: ['type' => 'object', 'properties' => new \stdClass()],
            ], $request->tools);
            $body['tool_choice'] = $this->toolChoice($request->toolChoice);
        }

        foreach ((array) ($this->provider->mapping['extra_body'] ?? []) as $key => $value) {
            $body[$key] = $value;
        }

        return $this->buildHttpRequest(
            'POST',
            $this->url($request->stream && isset($this->provider->paths['stream']) ? 'stream' : 'messages', $request),
            $this->compact($body),
            $request->stream,
        );
    }

    protected function toolChoice(?string $choice): array
    {
        if (!$choice || $choice === 'auto') {
            return ['type' => 'auto'];
        }
        if ($choice === 'required' || $choice === 'any') {
            return ['type' => 'any'];
        }
        if (str_starts_with($choice, 'function:')) {
            return ['type' => 'tool', 'name' => substr($choice, 9)];
        }
        if (str_starts_with($choice, 'tool:')) {
            return ['type' => 'tool', 'name' => substr($choice, 5)];
        }

        return ['type' => 'auto'];
    }

    protected function messages(UnifiedRequest $request): array
    {
        $messages = [];

        foreach ($request->messages as $message) {
            if ($message->role === 'tool') {
                $this->append($messages, 'user', [
                    'type' => 'tool_result',
                    'tool_use_id' => (string) $message->toolCallId,
                    'content' => $message->content,
                ]);
                continue;
            }

            if ($message->role === 'assistant') {
                $blocks = [];
                if ($message->content !== '') {
                    $blocks[] = ['type' => 'text', 'text' => $message->content];
                }
                foreach ($message->toolCalls as $call) {
                    $blocks[] = [
                        'type' => 'tool_use',
                        'id' => (string) ($call['id'] ?? ''),
                        'name' => (string) ($call['name'] ?? ''),
                        'input' => $call['arguments'] ?? new \stdClass(),
                    ];
                }
                foreach ($blocks as $block) {
                    $this->append($messages, 'assistant', $block);
                }
                continue;
            }

            $blocks = [];
            if ($message->content !== '') {
                $blocks[] = ['type' => 'text', 'text' => $message->content];
            }
            foreach ($message->images as $image) {
                $block = $this->imageBlock($image);
                if ($block !== null) {
                    $blocks[] = $block;
                }
            }
            foreach ($blocks as $block) {
                $this->append($messages, 'user', $block);
            }
        }

        return array_map(fn (array $message) => [
            'role' => $message['role'],
            'content' => $message['blocks'],
        ], array_values($messages));
    }

    /**
     * Anthropic requires alternating roles. Adjacent blocks from the same role are
     * folded into one message rather than emitted separately.
     */
    protected function append(array &$messages, string $role, array $block): void
    {
        $last = array_key_last($messages);

        if ($last !== null && $messages[$last]['role'] === $role) {
            $messages[$last]['blocks'][] = $block;

            return;
        }

        $messages[] = ['role' => $role, 'blocks' => [$block]];
    }

    protected function imageBlock(array $image): ?array
    {
        if (!empty($image['data'])) {
            return [
                'type' => 'image',
                'source' => [
                    'type' => 'base64',
                    'media_type' => $image['media_type'] ?? 'image/png',
                    'data' => (string) $image['data'],
                ],
            ];
        }

        if (!empty($image['url'])) {
            return [
                'type' => 'image',
                'source' => ['type' => 'url', 'url' => (string) $image['url']],
            ];
        }

        return null;
    }

    public function parseResponse(AIUpstreamResponse $response): UnifiedResponse
    {
        $data = $response->json();

        if (isset($data['error']) && empty($data['content'])) {
            throw new AIProviderException(status: $response->status >= 400 ? $response->status : 502, body: $response->body, contentType: $response->contentType(), provider: $this->provider->id);
        }

        $text = '';
        $toolCalls = [];

        foreach ((array) ($data['content'] ?? []) as $index => $block) {
            if (!is_array($block)) {
                continue;
            }
            if (($block['type'] ?? null) === 'text') {
                $text .= (string) ($block['text'] ?? '');
            } elseif (($block['type'] ?? null) === 'tool_use') {
                $toolCalls[] = [
                    'id' => (string) ($block['id'] ?? 'call_' . $index),
                    'name' => (string) ($block['name'] ?? ''),
                    'arguments' => is_array($block['input'] ?? null) ? $block['input'] : [],
                ];
            }
        }

        $stop = (string) ($data['stop_reason'] ?? 'end_turn');

        return new UnifiedResponse(
            text: $text,
            toolCalls: $toolCalls,
            finishReason: $this->finishReason($stop),
            usage: DataAccess::normalizeUsage([
                'input_tokens' => $data['usage']['input_tokens'] ?? null,
                'output_tokens' => $data['usage']['output_tokens'] ?? null,
            ]),
            raw: $data,
            model: is_string($data['model'] ?? null) ? $data['model'] : null,
            id: is_string($data['id'] ?? null) ? $data['id'] : null,
            provider: $this->provider->id,
        );
    }

    public function finishReason(string $reason): string
    {
        return match ($reason) {
            'max_tokens' => 'length',
            'tool_use' => 'tool_calls',
            'refusal' => 'content_filter',
            default => 'stop',
        };
    }

    public function createStreamDecoder(): StreamDecoder
    {
        return new AnthropicStreamDecoder($this->provider, fn (string $reason) => $this->finishReason($reason));
    }
}
