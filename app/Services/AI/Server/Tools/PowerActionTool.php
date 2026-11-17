<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Wings\DaemonPowerRepository;

/**
 * Starts, stops or restarts the server.
 */
class PowerActionTool extends AbstractServerAITool
{
    private const ACTIONS = ['start', 'stop', 'restart', 'kill'];

    public function __construct(
        private readonly DaemonPowerRepository $powerRepository,
    ) {
    }

    public function name(): string
    {
        return 'power_action';
    }

    public function description(): string
    {
        return 'Start, stop or restart the server. Use "restart" after a configuration change so it '
            . 'takes effect, and "stop" before doing anything that needs the server to be offline.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'action' => [
                    'type' => 'string',
                    'enum' => self::ACTIONS,
                    'description' => 'The power action to perform.',
                ],
            ],
            'required' => ['action'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return match (strtolower((string) ($arguments['action'] ?? ''))) {
            'start' => [Permission::ACTION_CONTROL_START],
            'stop', 'kill' => [Permission::ACTION_CONTROL_STOP],
            'restart' => [Permission::ACTION_CONTROL_RESTART],
            default => [Permission::ACTION_CONTROL_START],
        };
    }

    public function summary(array $arguments): string
    {
        $action = strtolower((string) ($arguments['action'] ?? ''));

        return match ($action) {
            'start' => '启动服务器',
            'stop' => '停止服务器',
            'restart' => '重启服务器',
            'kill' => '强制结束服务器进程',
            default => '切换服务器电源状态',
        };
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $action = strtolower((string) ($arguments['action'] ?? ''));

        if (!in_array($action, self::ACTIONS, true)) {
            return ToolResult::fail('The action must be one of: ' . implode(', ', self::ACTIONS) . '.');
        }

        try {
            $this->powerRepository->setServer($server)->send($action);
        } catch (\Throwable $exception) {
            return ToolResult::fail('Could not send the power action: ' . $exception->getMessage());
        }

        Activity::event(strtolower('server:power.' . $action))
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf('Sent the "%s" power action.', $action));
    }
}
