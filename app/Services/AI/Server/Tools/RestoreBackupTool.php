<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonBackupRepository;

/**
 * Restores a backup over the server's files.
 */
class RestoreBackupTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonBackupRepository $daemonRepository,
    ) {
    }

    public function name(): string
    {
        return 'restore_backup';
    }

    public function description(): string
    {
        return 'Restore a backup over the server. This overwrites the current files. Set "truncate" to '
            . 'true to delete everything that is on the server now before unpacking the backup.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'backup' => [
                    'type' => 'string',
                    'description' => 'The UUID of the backup to restore.',
                ],
                'truncate' => [
                    'type' => 'boolean',
                    'description' => 'Delete the current files before restoring. Defaults to false.',
                ],
            ],
            'required' => ['backup'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_BACKUP_RESTORE];
    }

    public function summary(array $arguments): string
    {
        $backup = (string) $this->string($arguments, 'backup');
        $truncate = $this->boolean($arguments, 'truncate');

        return sprintf('恢复备份 %s%s', $backup, $truncate ? '（会先清空当前文件）' : '');
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $uuid = $this->string($arguments, 'backup');
        $truncate = $this->boolean($arguments, 'truncate');

        if ($uuid === null) {
            return ToolResult::fail('No backup was given.');
        }

        if (!is_null($server->status)) {
            return ToolResult::fail('The server is not in a state that allows a backup to be restored right now.');
        }

        $backup = $server->backups->firstWhere('uuid', $uuid);

        if (!$backup) {
            return ToolResult::fail('This server has no backup with that identifier.');
        }

        if (!$backup->is_successful && is_null($backup->completed_at)) {
            return ToolResult::fail('That backup cannot be restored: it never completed.');
        }

        try {
            $server->update(['status' => Server::STATUS_RESTORING_BACKUP]);

            $this->daemonRepository->setServer($server)->restore($backup, null, $truncate);
        } catch (\Throwable $exception) {
            $server->update(['status' => null]);

            return ToolResult::fail('Could not restore the backup: ' . $exception->getMessage());
        }

        Activity::event('server:backup.restore')
            ->subject($backup)
            ->property(['name' => $backup->name, 'truncate' => $truncate])
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('Restored the backup "%s".', $backup->name));
    }
}
