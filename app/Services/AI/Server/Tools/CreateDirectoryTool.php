<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonFileRepository;

/**
 * Creates a directory.
 */
class CreateDirectoryTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonFileRepository $fileRepository,
    ) {
    }

    public function name(): string
    {
        return 'create_directory';
    }

    public function description(): string
    {
        return 'Create a directory on the server, including any missing parent directories.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'path' => [
                    'type' => 'string',
                    'description' => 'Absolute path of the directory to create.',
                ],
            ],
            'required' => ['path'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_FILE_CREATE];
    }

    public function summary(array $arguments): string
    {
        return sprintf('创建目录 %s', $this->path($this->string($arguments, 'path')));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $path = $this->path($this->string($arguments, 'path'));

        if ($path === '/') {
            return ToolResult::ok('The server root already exists.');
        }

        try {
            $this->fileRepository->setServer($server)->createDirectory($this->basenameOf($path), $this->directoryOf($path));
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not create ' . $path . ': ' . $exception->getMessage());
        }

        Activity::event('server:file.create-directory')
            ->property('file', $path)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok('Created directory ' . $path . '.');
    }
}
