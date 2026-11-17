<?php

namespace Everest\Services\AI\Server;

use Everest\Models\User;
use Everest\Models\Server;
use Illuminate\Contracts\Foundation\Application;
use Everest\Services\AI\Server\Tools\PullFileTool;
use Everest\Services\AI\Server\Tools\ReadFileTool;
use Everest\Services\AI\Server\Tools\ListFilesTool;
use Everest\Services\AI\Server\Tools\WriteFileTool;
use Everest\Services\AI\Server\Tools\DeleteFileTool;
use Everest\Services\AI\Server\Tools\RenameFileTool;
use Everest\Services\AI\Server\Tools\RunCommandTool;
use Everest\Services\AI\Server\Tools\ServerInfoTool;
use Everest\Services\AI\Server\Tools\ActivityLogTool;
use Everest\Services\AI\Server\Tools\ListBackupsTool;
use Everest\Services\AI\Server\Tools\PowerActionTool;
use Everest\Services\AI\Server\Tools\SetVariableTool;
use Everest\Services\AI\Server\Contracts\ServerAITool;
use Everest\Services\AI\Server\Tools\CreateBackupTool;
use Everest\Services\AI\Server\Tools\RenameServerTool;
use Everest\Services\AI\Server\Tools\ConsoleOutputTool;
use Everest\Services\AI\Server\Tools\ListDatabasesTool;
use Everest\Services\AI\Server\Tools\ListSchedulesTool;
use Everest\Services\AI\Server\Tools\RestoreBackupTool;
use Everest\Services\AI\Server\Tools\CreateDatabaseTool;
use Everest\Services\AI\Server\Tools\DeleteDatabaseTool;
use Everest\Services\AI\Server\Tools\SetDockerImageTool;
use Everest\Services\AI\Server\Tools\CreateDirectoryTool;
use Everest\Services\AI\Server\Tools\ServerVariablesTool;
use Everest\Services\AI\Server\Tools\RotateDatabasePasswordTool;

/**
 * The catalogue of everything the assistant can do to a server.
 *
 * The registry is the single place that knows which tools exist. Adding a
 * capability means adding a tool class and listing it here; nothing else in
 * the panel has to change.
 */
class ServerAIToolRegistry
{
    /**
     * Every tool the assistant knows about. The order decides the order the
     * model sees them in, so the read-only ones come first.
     *
     * @var string[]
     */
    public const TOOLS = [
        ServerInfoTool::class,
        ConsoleOutputTool::class,
        ServerVariablesTool::class,
        ListFilesTool::class,
        ReadFileTool::class,
        ListDatabasesTool::class,
        ListBackupsTool::class,
        ListSchedulesTool::class,
        ActivityLogTool::class,
        RunCommandTool::class,
        WriteFileTool::class,
        PullFileTool::class,
        CreateDirectoryTool::class,
        RenameFileTool::class,
        DeleteFileTool::class,
        SetVariableTool::class,
        SetDockerImageTool::class,
        PowerActionTool::class,
        CreateDatabaseTool::class,
        RotateDatabasePasswordTool::class,
        DeleteDatabaseTool::class,
        CreateBackupTool::class,
        RestoreBackupTool::class,
        RenameServerTool::class,
    ];

    public function __construct(
        protected readonly Application $app,
    ) {
    }

    /**
     * @return ServerAITool[]
     */
    public function all(): array
    {
        return array_map(fn (string $class) => $this->app->make($class), self::TOOLS);
    }

    public function has(string $name): bool
    {
        return $this->find($name) !== null;
    }

    public function find(string $name): ?ServerAITool
    {
        foreach ($this->all() as $tool) {
            if ($tool->name() === $name) {
                return $tool;
            }
        }

        return null;
    }

    /**
     * The tools the given user is actually allowed to run.
     *
     * @return ServerAITool[]
     */
    public function forUser(Server $server, User $user): array
    {
        return array_values(array_filter(
            $this->all(),
            fn (ServerAITool $tool) => $this->allowed($tool, $server, $user, [])
        ));
    }

    /**
     * The read-only tools the given user is allowed to run.
     *
     * @return ServerAITool[]
     */
    public function readOnlyForUser(Server $server, User $user): array
    {
        return array_values(array_filter(
            $this->forUser($server, $user),
            fn (ServerAITool $tool) => !$tool->mutates()
        ));
    }

    /**
     * Whether the user holds one of the permissions the tool requires.
     */
    public function allowed(ServerAITool $tool, Server $server, User $user, array $arguments): bool
    {
        $permissions = $tool->permissions($arguments);

        if ($permissions === []) {
            return true;
        }

        foreach ($permissions as $permission) {
            if ($user->can($permission, $server)) {
                return true;
            }
        }

        return false;
    }
}
