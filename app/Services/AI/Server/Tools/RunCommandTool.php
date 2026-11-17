<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonCommandRepository;

/**
 * Sends a command to the server's console.
 */
class RunCommandTool extends AbstractServerAITool
{
    public function __construct(
        private readonly DaemonCommandRepository $commandRepository,
    ) {
    }

    public function name(): string
    {
        return 'run_command';
    }

    public function description(): string
    {
        return 'Send a command to the running server, exactly as if the user had typed it into the '
            . 'console. The output of the command appears in the console afterwards; read it with '
            . 'console_output to check the result.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'command' => [
                    'type' => 'string',
                    'description' => 'The console command to run, without the leading slash.',
                ],
            ],
            'required' => ['command'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_CONTROL_CONSOLE];
    }

    public function summary(array $arguments): string
    {
        return sprintf('执行控制台命令 %s', (string) $this->string($arguments, 'command'));
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $command = $this->string($arguments, 'command');

        if ($command === null) {
            return ToolResult::fail('No command was given.');
        }

        try {
            $this->commandRepository->setServer($server)->send($command);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not send the command: ' . $exception->getMessage());
        }

        Activity::event('server:console.command')
            ->property('command', $command)
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('Sent "%s" to the console.', $command));
    }
}
