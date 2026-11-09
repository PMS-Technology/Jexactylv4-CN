<?php

namespace Everest\Services\AI\Data;

/**
 * The single internal request shape used everywhere in the panel. Controllers and
 * features build this object; drivers translate it into their upstream wire format.
 */
final class UnifiedRequest
{
    /**
     * @param AIMessage[] $messages
     * @param AITool[] $tools
     * @param array $options provider-specific passthrough options
     */
    public function __construct(
        public readonly array $messages = [],
        public readonly ?string $system = null,
        public readonly ?string $model = null,
        public readonly int $maxTokens = 1024,
        public readonly ?float $temperature = 0.7,
        public readonly array $tools = [],
        public readonly ?string $toolChoice = null,
        public readonly bool $stream = false,
        public readonly array $options = [],
    ) {
    }

    public static function fromArray(array $payload): self
    {
        $messages = [];
        foreach ((array) ($payload['messages'] ?? []) as $message) {
            if (is_array($message)) {
                $messages[] = AIMessage::fromArray($message);
            }
        }

        $tools = [];
        foreach ((array) ($payload['tools'] ?? []) as $tool) {
            if (is_array($tool) && !empty($tool)) {
                $tools[] = AITool::fromArray($tool);
            }
        }

        $system = $payload['system'] ?? null;

        // A system message may also arrive inside the conversation; fold it into the
        // dedicated system prompt so every driver sees one consistent value.
        $remaining = [];
        $systemParts = [];
        foreach ($messages as $message) {
            if ($message->role === 'system') {
                $systemParts[] = $message->content;
                continue;
            }
            $remaining[] = $message;
        }
        if ($systemParts !== []) {
            $system = trim(implode("\n\n", array_filter([$system, ...$systemParts])));
        }

        return new self(
            messages: $remaining,
            system: $system !== '' ? $system : null,
            model: isset($payload['model']) && $payload['model'] !== '' ? (string) $payload['model'] : null,
            maxTokens: (int) ($payload['max_tokens'] ?? 1024),
            temperature: array_key_exists('temperature', $payload) && $payload['temperature'] !== null
                ? (float) $payload['temperature']
                : 0.7,
            tools: $tools,
            toolChoice: isset($payload['tool_choice']) ? (string) $payload['tool_choice'] : null,
            stream: (bool) ($payload['stream'] ?? false),
            options: is_array($payload['options'] ?? null) ? $payload['options'] : [],
        );
    }

    public function withModel(?string $model): self
    {
        return new self(
            $this->messages,
            $this->system,
            $model ?: $this->model,
            $this->maxTokens,
            $this->temperature,
            $this->tools,
            $this->toolChoice,
            $this->stream,
            $this->options,
        );
    }

    public function withStream(bool $stream): self
    {
        return new self(
            $this->messages,
            $this->system,
            $this->model,
            $this->maxTokens,
            $this->temperature,
            $this->tools,
            $this->toolChoice,
            $stream,
            $this->options,
        );
    }

    public function option(string $key, mixed $default = null): mixed
    {
        return $this->options[$key] ?? $default;
    }
}
