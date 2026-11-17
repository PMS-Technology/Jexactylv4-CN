<?php

namespace Everest\Services\AI\Server;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Runs a tool the model asked for.
 *
 * The executor is the only place where a model-supplied call turns into an
 * action. It resolves the tool, checks that the user is allowed to run it and
 * turns any failure into a message the model can read, so the model can adjust
 * instead of retrying blindly.
 */
class ServerAIToolExecutor
{
    public function __construct(
        protected readonly ServerAIToolRegistry $registry,
    ) {
    }

    /**
     * Describe a call for the approval card.
     */
    public function describe(string $name, array $arguments): array
    {
        $tool = $this->registry->find($name);

        if (!$tool) {
            return [
                'name' => $name,
                'arguments' => $arguments,
                'summary' => sprintf('未知工具 %s', $name),
                'mutates' => true,
                'known' => false,
            ];
        }

        return [
            'name' => $tool->name(),
            'arguments' => $arguments,
            'summary' => $tool->summary($arguments),
            'mutates' => $tool->mutates(),
            'known' => true,
        ];
    }

    /**
     * Execute a single tool call.
     */
    public function execute(
        Server $server,
        User $user,
        string $name,
        array $arguments,
        array $context = [],
    ): ToolResult {
        $tool = $this->registry->find($name);

        if (!$tool) {
            return ToolResult::fail(sprintf(
                'There is no tool called "%s". Available tools: %s.',
                $name,
                implode(', ', array_map(fn ($t) => $t->name(), $this->registry->all()))
            ));
        }

        if (!$this->registry->allowed($tool, $server, $user, $arguments)) {
            return ToolResult::fail(sprintf(
                'You do not have permission to use "%s" on this server.',
                $tool->name()
            ));
        }

        try {
            return $tool->handle($server, $user, $arguments, $context);
        } catch (\Throwable $exception) {
            return ToolResult::fail(sprintf(
                'The tool "%s" failed: %s',
                $tool->name(),
                $exception->getMessage()
            ));
        }
    }
}
