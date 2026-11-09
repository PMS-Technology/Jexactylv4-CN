<?php

namespace Everest\Services\AI\Support;

/**
 * Tiny dot-path reader used by the configurable response/model mappings.
 */
final class DataAccess
{
    public static function get(array|object|null $data, string|array|null $path, mixed $default = null): mixed
    {
        if (is_null($path) || $path === '') {
            return $data ?? $default;
        }

        if (is_array($path)) {
            foreach ($path as $candidate) {
                $value = self::get($data, $candidate, '__missing__');
                if ($value !== '__missing__' && !is_null($value)) {
                    return $value;
                }
            }

            return $default;
        }

        $current = $data;
        foreach (explode('.', $path) as $segment) {
            if (is_array($current) && array_key_exists($segment, $current)) {
                $current = $current[$segment];
                continue;
            }
            if (is_object($current) && isset($current->{$segment})) {
                $current = $current->{$segment};
                continue;
            }

            return $default;
        }

        return $current ?? $default;
    }

    public static function text(mixed $content): string
    {
        if (is_string($content)) {
            return $content;
        }

        if (!is_array($content)) {
            return '';
        }

        $parts = [];
        foreach ($content as $part) {
            if (is_string($part)) {
                $parts[] = $part;
                continue;
            }
            if (!is_array($part)) {
                continue;
            }
            foreach (['text', 'content', 'output_text'] as $key) {
                if (isset($part[$key]) && is_string($part[$key])) {
                    $parts[] = $part[$key];
                    break;
                }
            }
        }

        return implode('', $parts);
    }

    public static function decodeJson(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : [];
    }

    public static function normalizeUsage(array $usage, array $mapping = []): array
    {
        $prompt = self::get($usage, $mapping['prompt'] ?? ['prompt_tokens', 'input_tokens', 'promptTokenCount', 'prompt_eval_count']);
        $completion = self::get($usage, $mapping['completion'] ?? ['completion_tokens', 'output_tokens', 'candidatesTokenCount', 'eval_count']);
        $total = self::get($usage, $mapping['total'] ?? ['total_tokens', 'totalTokenCount']);

        $prompt = is_numeric($prompt) ? (int) $prompt : null;
        $completion = is_numeric($completion) ? (int) $completion : null;
        $total = is_numeric($total) ? (int) $total : (($prompt ?? 0) + ($completion ?? 0));

        return array_filter([
            'prompt_tokens' => $prompt,
            'completion_tokens' => $completion,
            'total_tokens' => $total ?: null,
        ], fn ($value) => !is_null($value));
    }
}
