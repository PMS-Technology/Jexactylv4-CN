<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Switches the docker image the server runs on.
 */
class SetDockerImageTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'set_docker_image';
    }

    public function description(): string
    {
        return 'Switch the docker image the server runs on. Only the images configured for this game '
            . 'are allowed, so read server_info or server_variables first to see which ones exist.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'image' => [
                    'type' => 'string',
                    'description' => 'The full docker image reference, e.g. "ghcr.io/example/game:latest".',
                ],
            ],
            'required' => ['image'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_STARTUP_DOCKER_IMAGE];
    }

    public function summary(array $arguments): string
    {
        return sprintf('切换 Docker 镜像为 %s', (string) $this->string($arguments, 'image'));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $image = $this->string($arguments, 'image');

        if ($image === null) {
            return ToolResult::fail('No image was given.');
        }

        $allowed = array_values((array) ($server->egg->docker_images ?? []));

        if ($allowed !== [] && !in_array($image, $allowed, true)) {
            return ToolResult::fail(sprintf(
                'The image "%s" is not available for this game. Allowed images: %s',
                $image,
                implode(', ', $allowed)
            ));
        }

        $original = $server->image;
        $server->forceFill(['image' => $image])->saveOrFail();

        Activity::event('server:startup.image')
            ->property(['old' => $original, 'new' => $image])
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('The server now runs on %s.', $image));
    }
}
