<?php

namespace Everest\Services\AI\Data;

final class UnifiedResponse
{
    /**
     * @param array $toolCalls list of ['id' => string, 'name' => string, 'arguments' => array]
     * @param array $usage normalized prompt_tokens/completion_tokens/total_tokens
     * @param array $raw untouched upstream JSON, useful for diagnostics
     */
    public function __construct(
        public readonly string $text = '',
        public readonly array $toolCalls = [],
        public readonly string $finishReason = 'stop',
        public readonly array $usage = [],
        public readonly array $raw = [],
        public readonly ?string $model = null,
        public readonly ?string $id = null,
        public readonly ?string $provider = null,
    ) {
    }

    public function toArray(bool $includeRaw = false): array
    {
        $payload = [
            'provider' => $this->provider,
            'model' => $this->model,
            'id' => $this->id,
            'text' => $this->text,
            'tool_calls' => $this->toolCalls,
            'finish_reason' => $this->finishReason,
            'usage' => $this->usage,
        ];

        if ($includeRaw) {
            $payload['raw'] = $this->raw;
        }

        return $payload;
    }
}
