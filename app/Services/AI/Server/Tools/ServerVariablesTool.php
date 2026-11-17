<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Services\Servers\StartupCommandService;

/**
 * The startup parameters of the server: the environment variables that are
 * substituted into the startup command, plus the command itself.
 */
class ServerVariablesTool extends AbstractServerAITool
{
    public function __construct(
        private readonly StartupCommandService $startupCommandService,
    ) {
    }

    public function name(): string
    {
        return 'server_variables';
    }

    public function description(): string
    {
        return 'Read the startup parameters (environment variables) of this server together with the '
            . 'startup command they are substituted into. Use this to see which values the server is '
            . 'actually running with, and which ones can be edited.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => new \stdClass(),
        ];
    }

    public function mutates(): bool
    {
        return false;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_STARTUP_READ];
    }

    public function summary(array $arguments): string
    {
        return '读取启动参数';
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $variables = $server->variables()->where('user_viewable', true)->get()->map(fn ($variable) => [
            'key' => $variable->env_variable,
            'value' => $variable->server_value,
            'default' => $variable->default_value,
            'description' => $variable->description,
            'editable' => (bool) $variable->user_editable,
        ])->all();

        $payload = [
            'startup_command' => $this->startupCommandService->handle($server),
            'raw_startup_command' => $server->startup,
            'docker_images' => $server->egg->docker_images ?? [],
            'variables' => $variables,
        ];

        return ToolResult::ok(json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '');
    }
}
