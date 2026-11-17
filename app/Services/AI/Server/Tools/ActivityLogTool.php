<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Models\ActivityLog;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Reads the activity log of the server.
 */
class ActivityLogTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'activity_log';
    }

    public function description(): string
    {
        return 'Read the recent activity log of this server: who changed what and when. Use it to see '
            . 'which actions were already taken, for example whether a variable was already changed.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'event' => [
                    'type' => 'string',
                    'description' => 'Only show events whose name contains this text, e.g. "file" or "startup".',
                ],
                'limit' => [
                    'type' => 'integer',
                    'description' => 'How many entries to return. Defaults to 25.',
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
        return [Permission::ACTION_ACTIVITY_READ];
    }

    public function summary(array $arguments): string
    {
        return '读取活动日志';
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $limit = min($this->integer($arguments, 'limit', 25) ?? 25, 100);
        $event = $this->string($arguments, 'event');

        $query = ActivityLog::query()
            ->where('subject_type', 'server')
            ->where('subject_id', $server->id)
            ->orderByDesc('timestamp')
            ->limit($limit);

        if ($event !== null) {
            $query->where('event', 'like', '%' . $event . '%');
        }

        $lines = $query->get()->map(function (ActivityLog $log) {
            $properties = $log->properties;

            if ($properties instanceof \Illuminate\Support\Collection) {
                $properties = $properties->toArray();
            }

            $details = $properties === [] ? '' : ' ' . json_encode($properties, JSON_UNESCAPED_UNICODE);

            return sprintf(
                '%s  %s  %s%s',
                (string) $log->timestamp,
                (string) $log->event,
                (string) ($log->description ?? ''),
                $details
            );
        })->all();

        return ToolResult::ok($lines === [] ? '(no activity)' : implode("\n", $lines));
    }
}
