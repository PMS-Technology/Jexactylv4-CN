<?php

namespace Everest\Services\AI\Server\Contracts;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * One capability the model can invoke against a single server.
 *
 * Tools are the boundary between the model and the panel: the model may only
 * ask, and every tool decides for itself whether it may act. A tool that
 * changes the server reports `mutates() === true`, which puts it behind the
 * user's approval before it runs.
 */
interface ServerAITool
{
    /**
     * The name the model calls the tool by. Must be unique and snake_case.
     */
    public function name(): string;

    /**
     * What the tool does, written for the model rather than for a human.
     */
    public function description(): string;

    /**
     * The JSON schema describing the tool's arguments.
     */
    public function parameters(): array;

    /**
     * Whether running the tool changes the server. Mutating tools require the
     * user's approval unless they run in bypass mode.
     */
    public function mutates(): bool;

    /**
     * The server permissions that allow the tool to run. Holding any one of
     * them is enough.
     *
     * @return string[]
     */
    public function permissions(array $arguments = []): array;

    /**
     * A short, human readable summary of what the tool is about to do. It is
     * shown on the approval card, so it should describe the concrete effect
     * rather than repeat the description.
     */
    public function summary(array $arguments): string;

    /**
     * Run the tool.
     *
     * @param array $arguments the arguments the model supplied
     * @param array $context extra state for this turn, such as the console log
     */
    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult;
}
