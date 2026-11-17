<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonFileRepository;

/**
 * Renames or moves a file.
 */
class RenameFileTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonFileRepository $fileRepository,
    ) {
    }

    public function name(): string
    {
        return 'rename_file';
    }

    public function description(): string
    {
        return 'Rename or move a file on the server. Use it to give a downloaded mod the name the '
            . 'game expects, or to move a file into the folder it belongs in.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'from' => [
                    'type' => 'string',
                    'description' => 'Absolute path of the file or directory to move.',
                ],
                'to' => [
                    'type' => 'string',
                    'description' => 'Absolute path the file should end up at.',
                ],
            ],
            'required' => ['from', 'to'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_FILE_UPDATE];
    }

    public function summary(array $arguments): string
    {
        return sprintf(
            '重命名 %s → %s',
            $this->path($this->string($arguments, 'from')),
            $this->path($this->string($arguments, 'to'))
        );
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $from = $this->path($this->string($arguments, 'from'));
        $to = $this->path($this->string($arguments, 'to'));

        try {
            $this->fileRepository->setServer($server)->renameFiles($this->directoryOf($from), [
                ['from' => $this->basenameOf($from), 'to' => $to],
            ]);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not rename ' . $from . ': ' . $exception->getMessage());
        }

        Activity::event('server:file.rename')
            ->property('file', $from)
            ->property('to', $to)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('Renamed %s to %s.', $from, $to));
    }
}
