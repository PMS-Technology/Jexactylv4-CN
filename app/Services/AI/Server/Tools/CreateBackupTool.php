<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Services\Backups\InitiateBackupService;

/**
 * Starts a backup of the server.
 */
class CreateBackupTool extends AbstractServerAITool
{
    public function __construct(
        private readonly InitiateBackupService $initiateBackupService,
    ) {
    }

    public function name(): string
    {
        return 'create_backup';
    }

    public function description(): string
    {
        return 'Start a backup of the server. The backup runs in the background on the node. Use it '
            . 'before a risky change so the user can go back to the previous state.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'name' => [
                    'type' => 'string',
                    'description' => 'A name for the backup, e.g. "before mod install".',
                ],
                'ignored' => [
                    'type' => 'string',
                    'description' => 'Newline separated list of paths to exclude from the backup.',
                ],
            ],
            'required' => [],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_BACKUP_CREATE];
    }

    public function summary(array $arguments): string
    {
        $name = $this->string($arguments, 'name');

        return $name === null ? '创建备份' : sprintf('创建备份「%s」', $name);
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $name = $this->string($arguments, 'name');
        $ignored = $this->string($arguments, 'ignored');

        try {
            $backup = $this->initiateBackupService
                ->setIgnoredFiles($ignored === null ? [] : explode(PHP_EOL, $ignored))
                ->handle($server, $name);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not start the backup: ' . $exception->getMessage());
        }

        Activity::event('server:backup.start')
            ->subject($backup)
            ->property(['name' => $backup->name, 'source' => 'ai'])
            ->log();

        return ToolResult::ok(sprintf('Started the backup "%s".', $backup->name));
    }
}
