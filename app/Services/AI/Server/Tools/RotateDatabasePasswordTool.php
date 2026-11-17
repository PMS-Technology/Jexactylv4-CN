<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Services\Databases\DatabasePasswordService;

/**
 * Rotates the password of a database.
 */
class RotateDatabasePasswordTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DatabasePasswordService $passwordService,
    ) {
    }

    public function name(): string
    {
        return 'rotate_database_password';
    }

    public function description(): string
    {
        return 'Rotate the password of a database. The old password stops working immediately, so the '
            . 'server configuration has to be updated with the new one in the same session.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'database' => [
                    'type' => 'string',
                    'description' => 'The name of the database whose password should be rotated.',
                ],
            ],
            'required' => ['database'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_DATABASE_UPDATE];
    }

    public function summary(array $arguments): string
    {
        return sprintf('轮换数据库 %s 的密码', (string) $this->string($arguments, 'database'));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $name = $this->string($arguments, 'database');

        if ($name === null) {
            return ToolResult::fail('No database name was given.');
        }

        $database = $server->databases->firstWhere('database', $name);

        if (!$database) {
            return ToolResult::fail(sprintf('This server has no database named "%s".', $name));
        }

        try {
            $this->passwordService->handle($database);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not rotate the password: ' . $exception->getMessage());
        }

        Activity::event('server:database.rotate-password')
            ->subject($database)
            ->property('name', $database->database)
            ->property('source', 'ai')
            ->log();

        $message = sprintf('Rotated the password of "%s".', $name);

        if ($user->can(Permission::ACTION_DATABASE_VIEW_PASSWORD, $server)) {
            $encrypter = app(\Illuminate\Contracts\Encryption\Encrypter::class);

            try {
                $message .= sprintf(' The new password is "%s".', $encrypter->decrypt($database->refresh()->password));
            } catch (\Throwable) {
                // The password stays hidden when it cannot be decrypted.
            }
        }

        return ToolResult::ok($message);
    }
}
