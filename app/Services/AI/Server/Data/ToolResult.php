<?php

namespace Everest\Services\AI\Server\Data;

/**
 * The outcome of one tool invocation, as it is handed back to the model.
 *
 * `output` is what the model reads: on success it is the factual result, on
 * failure it explains what went wrong so the model can adjust instead of
 * retrying blindly.
 */
final class ToolResult
{
    public function __construct(
        public readonly bool $ok,
        public readonly string $output,
        public readonly array $meta = [],
    ) {
    }

    public static function ok(string $output, array $meta = []): self
    {
        return new self(true, $output, $meta);
    }

    public static function fail(string $error, array $meta = []): self
    {
        return new self(false, $error, $meta);
    }

    public function toArray(): array
    {
        return [
            'ok' => $this->ok,
            'output' => $this->output,
            'meta' => $this->meta,
        ];
    }
}
