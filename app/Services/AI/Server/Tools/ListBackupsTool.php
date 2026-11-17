<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Backup;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Lists the backups of the server.
 */
class ListBackupsTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'list_backups';
    }

    public function description(): string
    {
        return 'List the backups of this server with their name, size, creation time and whether they '
            . 'completed successfully. Use it before restoring or creating a backup.';
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
        return [Permission::ACTION_BACKUP_READ];
    }

    public function summary(array $arguments): string
    {
        return '读取备份列表';
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $rows = $server->backups
            ->sortByDesc(fn (Backup $backup) => $backup->created_at)
            ->take(50)
            ->map(fn (Backup $backup) => [
                'uuid' => $backup->uuid,
                'name' => $backup->name,
                'bytes' => $backup->bytes,
                'successful' => (bool) $backup->is_successful,
                'locked' => (bool) $backup->is_locked,
                'created_at' => (string) $backup->created_at,
            ])
            ->all();

        return ToolResult::ok($this->table($rows, ['name', 'uuid', 'bytes', 'successful', 'locked', 'created_at']));
    }
}
