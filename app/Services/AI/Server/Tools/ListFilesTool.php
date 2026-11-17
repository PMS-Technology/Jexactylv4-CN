<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonFileRepository;

/**
 * Lists a directory on the server's filesystem.
 */
class ListFilesTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonFileRepository $fileRepository,
    ) {
    }

    public function name(): string
    {
        return 'list_files';
    }

    public function description(): string
    {
        return 'List the files and folders in a directory on this server. Paths are absolute inside the '
            . 'server, for example "/plugins" or "/server.properties". Use this to find out what exists '
            . 'before reading or changing a file.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'path' => [
                    'type' => 'string',
                    'description' => 'The directory to list. Defaults to the server root ("/").',
                ],
            ],
            'required' => [],
        ];
    }

    public function mutates(): bool
    {
        return false;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_FILE_READ];
    }

    public function summary(array $arguments): string
    {
        return sprintf('列出目录 %s', $this->path($this->string($arguments, 'path')));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $path = $this->path($this->string($arguments, 'path'));

        try {
            $entries = $this->fileRepository->setServer($server)->getDirectory($path);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not list ' . $path . ': ' . $exception->getMessage());
        }

        $rows = [];
        foreach ((array) $entries as $entry) {
            $rows[] = [
                'name' => (string) ($entry['name'] ?? ''),
                'type' => ($entry['file'] ?? true) ? 'file' : 'dir',
                'size' => (int) ($entry['size'] ?? 0),
                'modified' => (string) ($entry['modified'] ?? ''),
            ];
        }

        usort($rows, fn ($a, $b) => [$a['type'], $a['name']] <=> [$b['type'], $b['name']]);

        $header = sprintf('%s (%d entries)', $path, count($rows));

        return ToolResult::ok($header . "\n" . $this->table($rows, ['name', 'type', 'size', 'modified']));
    }
}
