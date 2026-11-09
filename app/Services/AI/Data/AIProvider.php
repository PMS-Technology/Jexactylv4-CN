<?php

namespace Everest\Services\AI\Data;

use Everest\Services\AI\Exceptions\AIConfigurationException;

/**
 * An immutable, fully resolved provider definition.
 *
 * Everything a driver needs to talk to an upstream service lives here: the base
 * URL, authentication, headers, endpoint paths, field mapping and model discovery
 * rules. Routing rules may clone this object with a different driver/endpoint for
 * a specific model without any change to the calling code.
 */
final class AIProvider
{
    public function __construct(
        public readonly string $id,
        public readonly string $label,
        public readonly string $driver,
        public readonly string $baseUrl = '',
        public readonly array $auth = [],
        public readonly array $headers = [],
        public readonly array $paths = [],
        public readonly array $models = [],
        public readonly array $mapping = [],
        public readonly array $options = [],
        public readonly ?string $defaultModel = null,
    ) {
    }

    public static function fromConfig(string $id, array $config): self
    {
        return new self(
            id: $id,
            label: (string) ($config['label'] ?? $id),
            driver: (string) ($config['driver'] ?? 'openai_chat'),
            baseUrl: (string) ($config['base_url'] ?? ''),
            auth: (array) ($config['auth'] ?? []),
            headers: (array) ($config['headers'] ?? []),
            paths: (array) ($config['paths'] ?? []),
            models: (array) ($config['models'] ?? []),
            mapping: (array) ($config['mapping'] ?? []),
            options: (array) ($config['options'] ?? []),
            defaultModel: $config['default_model'] ?? null,
        );
    }

    /**
     * Merge runtime overrides (admin settings or a per-model route) into a copy.
     */
    public function with(array $overrides): self
    {
        return new self(
            id: $this->id,
            label: $this->label,
            driver: (string) ($overrides['driver'] ?? $this->driver),
            baseUrl: (string) ($overrides['base_url'] ?? $this->baseUrl),
            auth: array_replace($this->auth, (array) ($overrides['auth'] ?? [])),
            headers: array_replace($this->headers, (array) ($overrides['headers'] ?? [])),
            paths: array_replace($this->paths, (array) ($overrides['paths'] ?? [])),
            models: array_replace($this->models, (array) ($overrides['models'] ?? [])),
            mapping: array_replace($this->mapping, (array) ($overrides['mapping'] ?? [])),
            options: array_replace($this->options, (array) ($overrides['options'] ?? [])),
            defaultModel: $overrides['default_model'] ?? $this->defaultModel,
        );
    }

    /**
     * Resolve a configured path, substituting `{model}`, `{project}` and similar
     * placeholders. Absolute paths (starting with http) are returned untouched.
     *
     * @param array<string, scalar|null> $variables
     * @param array<string, scalar|null> $query
     */
    public function url(string $pathKey, array $variables = [], array $query = []): string
    {
        $path = $this->paths[$pathKey] ?? null;

        if (!is_string($path) || $path === '') {
            throw new AIConfigurationException(sprintf('AI provider [%s] has no [%s] endpoint configured.', $this->id, $pathKey));
        }

        $variables = array_replace([
            'model' => '',
            'project' => $this->option('project', ''),
            'location' => $this->option('location', 'us-central1'),
            'api_version' => $this->option('api_version', ''),
        ], $variables);

        $replace = function (string $value) use ($variables): string {
            return preg_replace_callback('/\{([a-z_]+)\}/i', function (array $match) use ($variables) {
                if (!array_key_exists($match[1], $variables)) {
                    return $match[0];
                }

                return $match[1] === 'model'
                    ? rawurlencode((string) $variables[$match[1]])
                    : (string) $variables[$match[1]];
            }, $value);
        };

        $path = $replace($path);
        $base = $replace($this->baseUrl);

        if (preg_match('#^https?://#i', $path)) {
            $url = $path;
        } else {
            $url = rtrim($base, '/') . '/' . ltrim($path, '/');
        }

        if ($query !== []) {
            $query = array_filter($query, fn ($value) => !is_null($value) && $value !== '');
            if ($query !== []) {
                $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($query);
            }
        }

        return $url;
    }

    public function option(string $key, mixed $default = null): mixed
    {
        return $this->options[$key] ?? $default;
    }

    public function mappingValue(string $key, mixed $default = null): mixed
    {
        return $this->mapping[$key] ?? $default;
    }

    public function requiresKey(): bool
    {
        if (array_key_exists('requires_key', $this->options)) {
            return (bool) $this->options['requires_key'];
        }

        return !in_array($this->auth['type'] ?? 'none', ['none', ''], true);
    }

    public function hasToken(): bool
    {
        return !empty($this->auth['token']);
    }

    public function publicDescription(): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'driver' => $this->driver,
            'base_url' => $this->baseUrl,
            'default_model' => $this->defaultModel,
            'requires_key' => $this->requiresKey(),
            'configured' => !$this->requiresKey() || $this->hasToken(),
            'model_sync' => (bool) ($this->models['enabled'] ?? false),
            'supports_stream' => true,
        ];
    }
}
