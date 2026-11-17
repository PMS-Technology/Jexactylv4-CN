<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Renames the server or changes its description.
 */
class RenameServerTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'rename_server';
    }

    public function description(): string
    {
        return 'Rename the server or change its description. This only changes the label shown in the '
            . 'panel; it does not touch the server itself.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'name' => [
                    'type' => 'string',
                    'description' => 'The new name of the server.',
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'The new description. Omit to leave it unchanged.',
                ],
            ],
            'required' => ['name'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_SETTINGS_RENAME];
    }

    public function summary(array $arguments): string
    {
        return sprintf('重命名服务器为「%s」', (string) $this->string($arguments, 'name'));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $name = $this->string($arguments, 'name');

        if ($name === null) {
            return ToolResult::fail('No name was given.');
        }

        if (mb_strlen($name) > 191) {
            return ToolResult::fail('The name may be at most 191 characters long.');
        }

        $original = $server->name;
        $server->name = $name;

        if (array_key_exists('description', $arguments)) {
            $server->description = (string) $arguments['description'];
        }

        $server->saveOrFail();

        Activity::event('server:settings.rename')
            ->property(['old' => $original, 'new' => $name])
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('Renamed the server from "%s" to "%s".', $original, $name));
    }
}
