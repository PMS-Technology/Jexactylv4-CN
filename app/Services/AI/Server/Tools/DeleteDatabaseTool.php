<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Services\Databases\DatabaseManagementService;

/**
 * Removes a database from the server.
 */
class DeleteDatabaseTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DatabaseManagementService $managementService,
    ) {
    }

    public function name(): string
    {
        return 'delete_database';
    }

    public function description(): string
    {
        return 'Delete a database of this server. The database and all of its data are dropped on the '
            . 'database host. List the databases first to get the exact name.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'database' => [
                    'type' => 'string',
                    'description' => 'The name of the database to delete.',
                ],
            ],
            'required' => ['database'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_DATABASE_DELETE];
    }

    public function summary(array $arguments): string
    {
        return sprintf('删除数据库 %s', (string) $this->string($arguments, 'database'));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $name = $this->string($arguments, 'database');

        if ($name === null) {
            return ToolResult::fail('No database name was given.');
        }

        $database = $server->databases->firstWhere('database', $name);

        if (!$database) {
            return ToolResult::fail(sprintf('This server has no database named "%s".', $name));
        }

        try {
            $this->managementService->delete($database);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not delete the database: ' . $exception->getMessage());
        }

        Activity::event('server:database.delete')
            ->subject($database)
            ->property('name', $database->database)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('Deleted the database "%s".', $name));
    }
}
