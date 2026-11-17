<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonFileRepository;

/**
 * Creates a file or overwrites an existing one.
 *
 * This is the tool the assistant uses for installing and configuring mods:
 * writing a config file, dropping in a plugin descriptor, patching a
 * properties file.
 */
class WriteFileTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonFileRepository $fileRepository,
    ) {
    }

    public function name(): string
    {
        return 'write_file';
    }

    public function description(): string
    {
        return 'Write a file on the server, creating it when it does not exist and overwriting it when '
            . 'it does. Send the complete new contents of the file, not a diff. Use it to install a '
            . 'mod, write a configuration file, or patch an existing one.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'path' => [
                    'type' => 'string',
                    'description' => 'Absolute path of the file inside the server, e.g. "/plugins/Example/config.yml".',
                ],
                'content' => [
                    'type' => 'string',
                    'description' => 'The complete contents to write to the file.',
                ],
            ],
            'required' => ['path', 'content'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_FILE_CREATE, Permission::ACTION_FILE_UPDATE];
    }

    public function summary(array $arguments): string
    {
        $path = $this->path($this->string($arguments, 'path'));
        $bytes = strlen((string) ($arguments['content'] ?? ''));

        return sprintf('写入文件 %s（%d 字节）', $path, $bytes);
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $path = $this->path($this->string($arguments, 'path'));
        $content = (string) ($arguments['content'] ?? '');

        if ($path === '/') {
            return ToolResult::fail('"/" is a directory, not a file.');
        }

        try {
            $this->fileRepository->setServer($server)->putContent($path, $content);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not write ' . $path . ': ' . $exception->getMessage());
        }

        Activity::event('server:file.write')
            ->property('file', $path)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('Wrote %d byte(s) to %s.', strlen($content), $path));
    }
}
