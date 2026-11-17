<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonFileRepository;

/**
 * Downloads a file from a URL straight onto the server.
 *
 * This is the tool used to install a mod: the daemon pulls the jar (or any
 * other release asset) into the server's filesystem without the file ever
 * passing through the browser.
 */
class PullFileTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonFileRepository $fileRepository,
    ) {
    }

    public function name(): string
    {
        return 'pull_file';
    }

    public function description(): string
    {
        return 'Download a file from an http(s) URL onto the server. The daemon fetches it, so large '
            . 'files do not go through the panel. Use it to install a mod from its release page. The '
            . 'download is queued in the background, so the file appears in the listing shortly after.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'url' => [
                    'type' => 'string',
                    'description' => 'The http(s) URL to download from.',
                ],
                'directory' => [
                    'type' => 'string',
                    'description' => 'Directory to save the file in. Defaults to "/".',
                ],
                'filename' => [
                    'type' => 'string',
                    'description' => 'Name to save the file under. Defaults to the name from the URL.',
                ],
            ],
            'required' => ['url'],
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
        $url = $this->string($arguments, 'url');
        $directory = $this->path($this->string($arguments, 'directory'));

        return sprintf('下载 %s 到 %s', (string) $url, $directory);
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $url = $this->string($arguments, 'url');
        $directory = $this->path($this->string($arguments, 'directory'));
        $filename = $this->string($arguments, 'filename');

        if ($url === null || !preg_match('#^https?://#i', $url)) {
            return ToolResult::fail('The url must start with http:// or https://.');
        }

        if ($filename !== null && (str_contains($filename, '/') || str_contains($filename, '\\'))) {
            return ToolResult::fail('The filename must not contain a path separator.');
        }

        try {
            $this->fileRepository->setServer($server)->pull($url, $directory, array_filter([
                'filename' => $filename,
            ]));
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not start the download: ' . $exception->getMessage());
        }

        Activity::event('server:file.pull')
            ->property('url', $url)
            ->property('directory', $directory)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf(
            'Queued the download of %s into %s. The file shows up in the file list once it finishes.',
            $url,
            $directory
        ));
    }
}
