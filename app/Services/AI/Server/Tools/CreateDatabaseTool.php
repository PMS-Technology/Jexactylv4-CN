<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Services\Databases\DeployServerDatabaseService;

/**
 * Creates a database for the server.
 */
class CreateDatabaseTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DeployServerDatabaseService $deployService,
    ) {
    }

    public function name(): string
    {
        return 'create_database';
    }

    public function description(): string
    {
        return 'Create a MySQL database for this server. The panel generates the username and the '
            . 'password. "connections_from" limits which hosts may connect, for example "%" for any '
            . 'host or "10.0.0.%" for the local network.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'database' => [
                    'type' => 'string',
                    'description' => 'Name of the database. Letters, digits, dashes and underscores only.',
                ],
                'connections_from' => [
                    'type' => 'string',
                    'description' => 'Which hosts may connect to the database, e.g. "%".',
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
        return [Permission::ACTION_DATABASE_CREATE];
    }

    public function summary(array $arguments): string
    {
        return sprintf(
            '创建数据库 %s（允许来源 %s）',
            (string) $this->string($arguments, 'database'),
            (string) ($arguments['connections_from'] ?? '%')
        );
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $name = $this->string($arguments, 'database');
        $remote = $this->string($arguments, 'connections_from', '%');

        if ($name === null || !preg_match('/^[A-Za-z0-9_-]{3,48}$/', $name)) {
            return ToolResult::fail('The database name must be 3 to 48 characters of letters, digits, dashes or underscores.');
        }

        if ($server->databases()->lockForUpdate()->count() >= $server->database_limit) {
            return ToolResult::fail('This server has reached its database limit.');
        }

        try {
            $database = $this->deployService->handle($server, [
                'database' => $name,
                'remote' => $remote,
            ]);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not create the database: ' . $exception->getMessage());
        }

        Activity::event('server:database.create')
            ->subject($database)
            ->property('name', $database->database)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf(
            'Created the database "%s" with the username "%s".',
            $database->database,
            $database->username
        ));
    }
}
