<?php

namespace Everest\Services\AI\Contracts;

use Everest\Services\AI\Data\AIStreamEvent;
use Everest\Services\AI\Data\UnifiedResponse;

interface StreamDecoder
{
    /**
     * Consume one SSE/NDJSON payload and return zero or more panel stream events.
     *
     * @return AIStreamEvent[]
     */
    public function push(?string $event, string $data): array;

    /**
     * The complete response assembled from every chunk seen so far.
     */
    public function result(): UnifiedResponse;
}
