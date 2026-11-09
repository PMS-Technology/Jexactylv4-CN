<?php

namespace Everest\Services\AI\Data;

final class AIStreamChunk
{
    public function __construct(
        public readonly ?string $event,
        public readonly string $data,
    ) {
    }
}
