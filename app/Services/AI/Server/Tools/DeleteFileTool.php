<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonFileRepository;

/**
 * Deletes a file or a directory.
 */
class DeleteFileTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonFileRepository $fileRepository,
    ) {
    }

    public function name(): string
    {
        return 'delete_file';
    }

    public function description(): string
    {
        return 'Delete a file or a directory from the server. Deleting a directory removes everything '
            . 'inside it. Read the file first and mention what will be lost before calling this.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'path' => [
                    'type' => 'string',
                    'description' => 'Absolute path of the file or directory to delete.',
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
        return [Permission::ACTION_FILE_DELETE];
    }

    public function summary(array $arguments): string
    {
        return sprintf('删除 %s', $this->path($this->string($arguments, 'path')));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $path = $this->path($this->string($arguments, 'path'));

        if ($path === '/') {
            return ToolResult::fail('Refusing to delete the server root.');
        }

        try {
            $this->fileRepository->setServer($server)->deleteFiles($this->directoryOf($path), [$this->basenameOf($path)]);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not delete ' . $path . ': ' . $exception->getMessage());
        }

        Activity::event('server:file.delete')
            ->property('file', $path)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok('Deleted ' . $path . '.');
    }
}
