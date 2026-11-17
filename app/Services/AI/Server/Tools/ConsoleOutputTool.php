<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Permission;
use Everest\Services\AI\Server\Data\ToolResult;

/**
 * Reads the console output of the server.
 *
 * The panel does not keep a copy of the console, so the browser sends the lines
 * it has seen over the websocket along with the request. This tool searches
 * that buffer, which is what makes crash diagnosis possible without the user
 * having to paste a log.
 */
class ConsoleOutputTool extends AbstractServerAITool
{
    public function name(): string
    {
        return 'console_output';
    }

    public function description(): string
    {
        return 'Search the console output of this server. The console buffer is the recent output the '
            . 'user sees in the terminal panel. Use it to find the exception or error that crashed the '
            . 'server. Provide "pattern" to filter the lines, and/or "lines" to read the last N lines.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'pattern' => [
                    'type' => 'string',
                    'description' => 'Case-insensitive substring to look for, e.g. "Exception" or "Error".',
                ],
                'lines' => [
                    'type' => 'integer',
                    'description' => 'How many of the most recent lines to return when no pattern is given. Defaults to 120.',
                ],
                'context' => [
                    'type' => 'integer',
                    'description' => 'How many lines to keep around each match. Defaults to 3.',
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
        return [Permission::ACTION_WEBSOCKET_CONNECT];
    }

    public function summary(array $arguments): string
    {
        return '读取控制台输出';
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $lines = (array) ($context['console_log'] ?? []);

        if ($lines === []) {
            return ToolResult::fail(
                'The console buffer is empty. Ask the user to open the console tab so the panel can '
                . 'capture the output, or ask them to paste the log.'
            );
        }

        $pattern = $this->string($arguments, 'pattern');
        $limit = $this->integer($arguments, 'lines', 120) ?? 120;
        $contextLines = $this->integer($arguments, 'context', 3) ?? 3;

        if ($pattern !== null) {
            $matches = [];
            foreach ($lines as $index => $line) {
                if (stripos((string) $line, $pattern) === false) {
                    continue;
                }

                $from = max(0, $index - $contextLines);
                $to = min(count($lines) - 1, $index + $contextLines);

                for ($i = $from; $i <= $to; ++$i) {
                    $matches[$i] = true;
                }
            }

            $keys = array_keys($matches);
            sort($keys);

            if ($keys === []) {
                return ToolResult::ok(sprintf(
                    'No console line contains "%s". The buffer holds %d lines in total.',
                    $pattern,
                    count($lines)
                ));
            }

            $selected = [];
            foreach ($keys as $key) {
                $selected[] = $lines[$key];
            }

            return ToolResult::ok(sprintf(
                "%d line(s) matching \"%s\" (with %d line(s) of context):\n%s",
                count($keys),
                $pattern,
                $contextLines,
                $this->truncate(implode("\n", $selected))
            ));
        }

        $selected = array_slice($lines, -$limit);

        return ToolResult::ok(sprintf(
            "Last %d console line(s) of %d:\n%s",
            count($selected),
            count($lines),
            $this->truncate(implode("\n", $selected))
        ));
    }
}
