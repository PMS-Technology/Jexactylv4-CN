<?php

namespace Everest\Services\AI\Server\Data;

use Everest\Services\AI\Data\UnifiedResponse;

/**
 * The outcome of one turn of the assistant.
 *
 * `executed` holds the tool calls that already ran, `pending` the ones that
 * change the server and still wait for the user's approval.
 */
final class ServerAITurn
{
    public function __construct(
        public readonly UnifiedResponse $response,
        public readonly array $executed = [],
        public readonly array $pending = [],
    ) {
    }

    /**
     * The assistant message, in the shape the client sends back to us.
     */
    public function assistantMessage(): array
    {
        return [
            'role' => 'assistant',
            'content' => $this->response->text,
            'tool_calls' => array_map(fn (array $call) => [
                'id' => (string) ($call['id'] ?? ''),
                'name' => (string) ($call['name'] ?? ''),
                'arguments' => (array) ($call['arguments'] ?? []),
            ], $this->response->toolCalls),
        ];
    }

    public function toArray(): array
    {
        return [
            'assistant' => $this->assistantMessage(),
            'executed' => $this->executed,
            'pending' => $this->pending,
            'usage' => $this->response->usage,
            'model' => $this->response->model,
            'provider' => $this->response->provider,
        ];
    }
}
