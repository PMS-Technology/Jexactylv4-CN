<?php

namespace Everest\Services\AI\Data;

final class AITool
{
    public function __construct(
        public readonly string $name,
        public readonly string $description = '',
        public readonly array $parameters = [],
    ) {
    }

    public static function fromArray(array $tool): self
    {
        // Accept both the panel shape and the OpenAI function wrapper.
        $function = is_array($tool['function'] ?? null) ? $tool['function'] : $tool;

        return new self(
            name: (string) ($function['name'] ?? ''),
            description: (string) ($function['description'] ?? ''),
            parameters: (array) ($function['parameters'] ?? ['type' => 'object', 'properties' => new \stdClass()]),
        );
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'description' => $this->description,
            'parameters' => $this->parameters ?: ['type' => 'object', 'properties' => new \stdClass()],
        ];
    }
}
