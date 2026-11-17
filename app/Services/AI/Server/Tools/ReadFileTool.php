<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonFileRepository;

/**
 * Reads the contents of a single file on the server.
 */
class ReadFileTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonFileRepository $fileRepository,
    ) {
    }

    public function name(): string
    {
        return 'read_file';
    }

    public function description(): string
    {
        return 'Read the contents of a file on this server. Use it on configuration files such as '
            . 'server.properties, ops.json, bukkit.yml or a mod\'s config to find out how the server is '
            . 'actually configured. Large files are truncated.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'path' => [
                    'type' => 'string',
                    'description' => 'Absolute path of the file inside the server, e.g. "/server.properties".',
                ],
            ],
            'required' => ['path'],
        ];
    }

    public function mutates(): bool
    {
        return false;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_FILE_READ_CONTENT];
    }

    public function summary(array $arguments): string
    {
        return sprintf('读取文件 %s', $this->path($this->string($arguments, 'path')));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $path = $this->path($this->string($arguments, 'path'));

        if ($path === '/') {
            return ToolResult::fail('"/" is a directory, not a file. Use list_files instead.');
        }

        try {
            $contents = $this->fileRepository->setServer($server)->getContent($path);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not read ' . $path . ': ' . $exception->getMessage());
        }

        return ToolResult::ok(sprintf("--- %s ---\n%s", $path, $this->truncate($contents)));
    }
}
