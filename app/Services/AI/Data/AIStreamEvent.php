<?php

namespace Everest\Services\AI\Data;

final class AIStreamEvent
{
    public function __construct(
        public readonly string $type,
        public readonly string $text = '',
        public readonly array $toolCall = [],
        public readonly array $usage = [],
        public readonly ?UnifiedResponse $response = null,
        public readonly ?string $error = null,
        public readonly array $raw = [],
    ) {
    }

    public static function text(string $text): self
    {
        return new self('text', $text);
    }

    public static function toolCall(array $toolCall): self
    {
        return new self('tool_call', toolCall: $toolCall);
    }

    public static function usage(array $usage): self
    {
        return new self('usage', usage: $usage);
    }

    public static function done(string $reason = 'stop'): self
    {
        return new self('done', usage: [], response: null, raw: ['finish_reason' => $reason]);
    }

    public static function error(string $message, array $raw = []): self
    {
        return new self('error', error: $message, raw: $raw);
    }

    public static function complete(UnifiedResponse $response): self
    {
        return new self('complete', text: $response->text, usage: $response->usage, response: $response);
    }

    public function toArray(): array
    {
        return array_filter([
            'type' => $this->type,
            'text' => $this->text,
            'tool_call' => $this->toolCall,
            'usage' => $this->usage,
            'error' => $this->error,
            'response' => $this->response?->toArray(),
            'raw' => $this->raw,
        ], fn ($value) => $value !== [] && $value !== '' && !is_null($value));
    }
}
