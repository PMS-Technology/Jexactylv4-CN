<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * A snapshot of the server itself: what it runs, how it is started and where it
 * listens. This is the first thing the model should read, because almost every
 * answer depends on it.
 */
class ServerInfoTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'server_info';
    }

    public function description(): string
    {
        return 'Read the configuration of this server: its name, game (egg), docker image, '
            . 'raw and rendered startup command, allocated ports, mounts and current status. '
            . 'Read this before answering anything about how the server runs.';
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
        return [Permission::ACTION_AI_ASSISTANT];
    }

    public function summary(array $arguments): string
    {
        return '读取服务器配置';
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $egg = $server->egg;
        $startup = $server->startup ?: ($egg->startup ?? '');

        $allocations = $server->allocations->map(fn ($allocation) => [
            'port' => $allocation->port,
            'ip' => $allocation->ip,
            'primary' => $allocation->id === $server->allocation_id,
        ])->all();

        $mounts = $server->mounts->map(fn ($mount) => [
            'path' => $mount->target,
            'read_only' => (bool) $mount->read_only,
        ])->all();

        $data = [
            'name' => $server->name,
            'uuid' => $server->uuid,
            'description' => $server->description,
            'game' => $egg->name,
            'docker_image' => $server->image,
            'startup_command' => $startup,
            'status' => $server->status ?? 'ready',
            'installed' => $server->isInstalled(),
            'limits' => [
                'memory_mb' => $server->memory,
                'swap_mb' => $server->swap,
                'disk_mb' => $server->disk,
                'cpu' => $server->cpu,
                'threads' => $server->threads,
                'oom_killer' => $server->oom_killer,
            ],
            'allocations' => $allocations,
            'mounts' => $mounts,
            'database_limit' => $server->database_limit,
            'backup_limit' => $server->backup_limit,
        ];

        return ToolResult::ok(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?: '');
    }
}
