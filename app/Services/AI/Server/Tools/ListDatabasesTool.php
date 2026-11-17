<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Lists the databases that belong to this server.
 */
class ListDatabasesTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'list_databases';
    }

    public function description(): string
    {
        return 'List the databases attached to this server, with their host, port, username and the '
            . 'addresses that may connect to them. The password is only included when the user is '
            . 'allowed to see it.';
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
        return [Permission::ACTION_DATABASE_READ];
    }

    public function summary(array $arguments): string
    {
        return '读取数据库列表';
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $canSeePassword = $user->can(Permission::ACTION_DATABASE_VIEW_PASSWORD, $server);
        $encrypter = app(\Illuminate\Contracts\Encryption\Encrypter::class);

        $rows = $server->databases->map(function ($database) use ($canSeePassword, $encrypter) {
            $database->loadMissing('host');

            $password = '(hidden)';
            if ($canSeePassword && !empty($database->password)) {
                try {
                    $password = $encrypter->decrypt($database->password);
                } catch (\Throwable) {
                    $password = '(unavailable)';
                }
            }

            return [
                'database' => $database->database,
                'username' => $database->username,
                'host' => $database->host->host,
                'port' => $database->host->port,
                'connections_from' => $database->remote,
                'password' => $password,
            ];
        })->all();

        return ToolResult::ok($this->table($rows, ['database', 'username', 'host', 'port', 'connections_from', 'password']));
    }
}
