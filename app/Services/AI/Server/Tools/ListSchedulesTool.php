<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Lists the scheduled tasks of the server.
 */
class ListSchedulesTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'list_schedules';
    }

    public function description(): string
    {
        return 'List the scheduled tasks of this server: their cron expression, whether they are '
            . 'active, when they run next and what each of their steps does.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => new \stdClass(),
        ];
    }

    public function mutates(): bool
    {
        return false;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_SCHEDULE_READ];
    }

    public function summary(array $arguments): string
    {
        return '读取计划任务';
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $lines = [];

        foreach ($server->schedules as $schedule) {
            $lines[] = sprintf(
                '- "%s" (id %d) %s%s',
                $schedule->name,
                $schedule->id,
                $schedule->is_active ? 'active' : 'inactive',
                $schedule->only_when_online ? ', only when online' : ''
            );
            $lines[] = sprintf(
                '    cron: %s %s %s %s %s',
                $schedule->cron_minute,
                $schedule->cron_hour,
                $schedule->cron_day_of_month,
                $schedule->cron_month,
                $schedule->cron_day_of_week
            );

            foreach ($schedule->tasks as $task) {
                $lines[] = sprintf(
                    '    step %d: %s %s (offset %ds)',
                    $task->sequence_id,
                    $task->action,
                    (string) $task->payload,
                    $task->time_offset
                );
            }
        }

        return ToolResult::ok($lines === [] ? '(no schedules)' : implode("\n", $lines));
    }
}
