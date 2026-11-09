<?php

namespace Everest\Services\AI\Data;

/**
 * One message in the panel's provider-neutral conversation format.
 *
 * `images` items are arrays with either a public `url` or base64 `data` plus an
 * optional `media_type`. Tool calls are represented as arrays with `id`, `name`
 * and an associative `arguments` payload, which drivers serialize as needed.
 */
final class AIMessage
{
    public function __construct(
        public readonly string $role,
        public readonly string $content = '',
        public readonly array $images = [],
        public readonly array $toolCalls = [],
        public readonly ?string $toolCallId = null,
        public readonly ?string $name = null,
    ) {
    }

    public static function system(string $content): self
    {
        return new self('system', $content);
    }

    public static function user(string $content, array $images = []): self
    {
        return new self('user', $content, $images);
    }

    public static function assistant(string $content = '', array $toolCalls = []): self
    {
        return new self('assistant', $content, [], $toolCalls);
    }

    public static function tool(string $toolCallId, string $content, ?string $name = null): self
    {
        return new self('tool', $content, [], [], $toolCallId, $name);
    }

    public static function fromArray(array $message): self
    {
        $images = [];
        foreach ((array) ($message['images'] ?? []) as $image) {
            if (!is_array($image)) {
                continue;
            }
            if (!empty($image['url'])) {
                $images[] = ['url' => (string) $image['url']];
            } elseif (!empty($image['data'])) {
                $images[] = [
                    'data' => (string) $image['data'],
                    'media_type' => (string) ($image['media_type'] ?? 'image/png'),
                ];
            }
        }

        $toolCalls = [];
        foreach ((array) ($message['tool_calls'] ?? []) as $index => $call) {
            if (!is_array($call)) {
                continue;
            }
            $arguments = $call['arguments'] ?? ($call['input'] ?? []);
            if (is_string($arguments)) {
                $decoded = json_decode($arguments, true);
                $arguments = is_array($decoded) ? $decoded : [];
            }
            $toolCalls[] = [
                'id' => (string) ($call['id'] ?? 'call_' . $index),
                'name' => (string) ($call['name'] ?? ''),
                'arguments' => is_array($arguments) ? $arguments : [],
            ];
        }

        return new self(
            role: (string) ($message['role'] ?? 'user'),
            content: (string) ($message['content'] ?? ''),
            images: $images,
            toolCalls: $toolCalls,
            toolCallId: isset($message['tool_call_id']) ? (string) $message['tool_call_id'] : null,
            name: isset($message['name']) ? (string) $message['name'] : null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'role' => $this->role,
            'content' => $this->content,
            'images' => $this->images,
            'tool_calls' => $this->toolCalls,
            'tool_call_id' => $this->toolCallId,
            'name' => $this->name,
        ], fn ($value) => $value !== [] && !is_null($value));
    }

    public function isToolResult(): bool
    {
        return $this->role === 'tool';
    }
}
