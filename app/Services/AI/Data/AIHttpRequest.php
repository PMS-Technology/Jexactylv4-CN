<?php

namespace Everest\Services\AI\Data;

final class AIHttpRequest
{
    public function __construct(
        public readonly string $method,
        public readonly string $url,
        public readonly array $headers = [],
        public readonly array $body = [],
        public readonly bool $stream = false,
        public readonly string $streamFormat = 'sse',
        public readonly string $providerId = '',
    ) {
    }
}
