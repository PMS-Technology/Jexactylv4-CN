<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Services\AI\Server\Contracts\ServerAITool;

/**
 * Shared plumbing for the server tools: argument reading, path normalisation
 * and the small formatting helpers the tool outputs are built from.
 */
abstract class AbstractServerAITool implements ServerAITool
{
    /**
     * Read a string argument, trimmed. Returns null when it is missing.
     */
    protected function string(array $arguments, string $key, ?string $default = null): ?string
    {
        $value = $arguments[$key] ?? null;

        if ($value === null) {
            return $default;
        }

        if (!is_scalar($value)) {
            return $default;
        }

        $value = trim((string) $value);

        return $value === '' ? $default : $value;
    }

    /**
     * Read an integer argument.
     */
    protected function integer(array $arguments, string $key, ?int $default = null): ?int
    {
        $value = $arguments[$key] ?? null;

        if ($value === null || !is_numeric($value)) {
            return $default;
        }

        return (int) $value;
    }

    /**
     * Read a boolean argument. Anything other than an explicit false counts
     * as true, which matches how models usually send flags.
     */
    protected function boolean(array $arguments, string $key, bool $default = false): bool
    {
        $value = $arguments[$key] ?? null;

        if ($value === null) {
            return $default;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return !in_array(strtolower($value), ['false', '0', 'no', 'off'], true);
        }

        return (bool) $value;
    }

    /**
     * Normalise a path inside the server's filesystem.
     *
     * The path is always treated as relative to the server root, so a model
     * cannot reach outside of it no matter what it sends.
     */
    protected function path(?string $path, string $default = '/'): string
    {
        $path = trim((string) $path);

        if ($path === '') {
            return $default;
        }

        // Strip any scheme or host the model may have prefixed.
        $path = preg_replace('#^[a-z][a-z0-9+.-]*://[^/]+#i', '', $path) ?? $path;
        $path = str_replace('\\', '/', $path);

        $segments = [];
        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..') {
                array_pop($segments);

                continue;
            }

            $segments[] = $segment;
        }

        return '/' . implode('/', $segments);
    }

    /**
     * The directory a path lives in.
     */
    protected function directoryOf(string $path): string
    {
        $path = $this->path($path);
        $directory = dirname($path);

        return $directory === '' || $directory === '.' ? '/' : rtrim($directory, '/');
    }

    /**
     * The last segment of a path.
     */
    protected function basenameOf(string $path): string
    {
        return basename(rtrim($this->path($path), '/'));
    }

    /**
     * Cut a string down to a size the model can actually read.
     */
    protected function truncate(string $value, int $limit = 8000): string
    {
        if (mb_strlen($value) <= $limit) {
            return $value;
        }

        return mb_substr($value, 0, $limit) . sprintf(
            "\n\n[truncated: %d more characters]",
            mb_strlen($value) - $limit
        );
    }

    /**
     * Render a list of rows as a compact table the model can parse.
     *
     * @param array<int, array<string, mixed>> $rows
     * @param string[] $columns
     */
    protected function table(array $rows, array $columns): string
    {
        if ($rows === []) {
            return '(none)';
        }

        $lines = [];
        foreach ($rows as $row) {
            $parts = [];
            foreach ($columns as $column) {
                $value = $row[$column] ?? '';
                if (is_bool($value)) {
                    $value = $value ? 'yes' : 'no';
                }
                $parts[] = $column . '=' . (is_scalar($value) ? (string) $value : json_encode($value));
            }
            $lines[] = implode('  ', $parts);
        }

        return implode("\n", $lines);
    }
}
