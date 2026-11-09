<?php

namespace Everest\Services\AI\Exceptions;

/**
 * Carries the upstream HTTP status and untouched response body so controllers can
 * return exactly what the provider said instead of a re-worded error.
 */
class AIProviderException extends AIException
{
    public function __construct(
        public readonly int $status,
        public readonly string $body,
        public readonly string $contentType = 'application/json',
        public readonly string $provider = '',
        public readonly string $url = '',
        ?\Throwable $previous = null,
    ) {
        parent::__construct(
            sprintf('AI provider [%s] returned HTTP %d.', $provider ?: 'unknown', $status),
            $status,
            $previous
        );
    }
}
