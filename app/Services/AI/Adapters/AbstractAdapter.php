<?php

namespace Everest\Services\AI\Adapters;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Contracts\ProviderAdapter;
use Everest\Services\AI\Exceptions\AIConfigurationException;

/**
 * Shared transport plumbing: authentication, headers, URL templates, and model
 * list discovery. Concrete adapters only deal with their protocol's JSON shape.
 */
abstract class AbstractAdapter implements ProviderAdapter
{
    public function __construct(
        protected readonly AIProvider $provider,
    ) {
    }

    public function provider(): AIProvider
    {
        return $this->provider;
    }

    protected function model(UnifiedRequest $request): string
    {
        $model = $request->model ?: $this->provider->defaultModel;

        if (!$model) {
            throw new AIConfigurationException(sprintf('No model configured for AI provider [%s].', $this->provider->id));
        }

        return $model;
    }

    /**
     * @param array<string, scalar|null> $variables
     */
    protected function url(string $pathKey, UnifiedRequest $request, array $variables = []): string
    {
        return $this->provider->url($pathKey, array_replace([
            'model' => $this->model($request),
        ], $variables), $this->authQuery());
    }

    protected function buildHttpRequest(
        string $method,
        string $url,
        array $body,
        bool $stream = false,
        string $streamFormat = 'sse',
        array $headers = [],
    ): AIHttpRequest {
        return new AIHttpRequest(
            method: $method,
            url: $url,
            headers: $this->headers($headers),
            body: $body,
            stream: $stream,
            streamFormat: $streamFormat,
            providerId: $this->provider->id,
        );
    }

    protected function headers(array $extra = []): array
    {
        $headers = array_merge(
            [
                'Accept' => 'application/json',
                'User-Agent' => 'JexpanelAI/1.0',
            ],
            $this->provider->headers,
            $this->authHeaders(),
            $extra
        );

        $token = (string) ($this->provider->auth['token'] ?? '');

        return array_map(
            fn ($value) => is_string($value) ? str_replace('{token}', $token, $value) : $value,
            $headers
        );
    }

    protected function authHeaders(): array
    {
        $auth = $this->provider->auth;
        $type = (string) ($auth['type'] ?? 'none');
        $token = (string) ($auth['token'] ?? '');

        if ($token === '' || $type === 'none' || $type === 'query') {
            return [];
        }

        return match ($type) {
            'bearer' => [
                ($auth['header'] ?? 'Authorization') => ($auth['prefix'] ?? 'Bearer ') . $token,
            ],
            'header' => [
                ($auth['header'] ?? 'x-api-key') => ($auth['prefix'] ?? '') . $token,
            ],
            'anthropic' => [
                'x-api-key' => $token,
                'anthropic-version' => $auth['version'] ?? '2023-06-01',
            ],
            'basic' => [
                'Authorization' => 'Basic ' . base64_encode(($auth['username'] ?? '') . ':' . $token),
            ],
            default => [],
        };
    }

    protected function authQuery(): array
    {
        $auth = $this->provider->auth;
        if (($auth['type'] ?? 'none') !== 'query' || empty($auth['token'])) {
            return [];
        }

        return [(string) ($auth['param'] ?? 'key') => (string) $auth['token']];
    }

    protected function pathVariables(): array
    {
        return [
            'project' => $this->provider->option('project', ''),
            'location' => $this->provider->option('location', 'us-central1'),
        ];
    }

    public function buildModelsRequest(): AIHttpRequest
    {
        $models = $this->provider->models;

        if (!($models['enabled'] ?? false)) {
            throw new AIConfigurationException(sprintf('Model discovery is disabled for AI provider [%s].', $this->provider->id));
        }

        $path = $models['path'] ?? 'models';
        $query = array_merge(
            $this->authQuery(),
            is_array($models['query'] ?? null) ? $models['query'] : []
        );

        $url = $this->provider->url($path, array_replace([
            'model' => '',
        ], $this->pathVariables()), $query);

        return new AIHttpRequest(
            method: strtoupper((string) ($models['method'] ?? 'GET')),
            url: $url,
            headers: $this->headers(),
            body: [],
            providerId: $this->provider->id,
        );
    }

    public function parseModels(AIUpstreamResponse $response): array
    {
        $config = $this->provider->models;
        $data = $response->json();
        $format = (string) ($config['format'] ?? 'openai');

        $itemsPath = $config['items'] ?? match ($format) {
            'openai', 'anthropic', 'command_code', 'opencode' => 'data',
            'gemini' => 'models',
            'ollama' => 'models',
            default => null,
        };

        $items = is_null($itemsPath)
            ? (array_is_list($data) ? $data : ($data['models'] ?? $data['data'] ?? []))
            : DataAccess::get($data, $itemsPath, []);

        // Some OpenAI-compatible gateways return the list directly or under `models`.
        if (!is_array($items) || $items === []) {
            $items = array_is_list($data) ? $data : ($data['models'] ?? $data['data'] ?? []);
        }

        if (!is_array($items)) {
            return [];
        }

        $idPath = $config['id_path'] ?? match ($format) {
            'gemini' => 'name',
            default => 'id',
        };
        $namePath = $config['name_path'] ?? match ($format) {
            'gemini' => 'displayName',
            'ollama' => 'name',
            default => 'name',
        };
        $contextPath = $config['context_path'] ?? 'context_length';

        $models = [];
        foreach ($items as $item) {
            if (is_string($item)) {
                $id = $item;
                $name = $item;
                $context = null;
            } elseif (is_array($item)) {
                $id = DataAccess::get($item, $idPath, DataAccess::get($item, 'id', DataAccess::get($item, 'name')));
                $name = DataAccess::get($item, $namePath, $id);
                $context = DataAccess::get($item, $contextPath, DataAccess::get($item, ['context_window', 'inputTokenLimit'], null));
            } else {
                continue;
            }

            if (!is_string($id) || $id === '') {
                continue;
            }

            $id = preg_replace('#^(?:models/|publishers/google/models/)#', '', $id);
            $models[$id] = array_filter([
                'id' => $id,
                'name' => is_string($name) && $name !== '' ? $name : $id,
                'context' => is_numeric($context) ? (int) $context : null,
            ], fn ($value) => !is_null($value));
        }

        ksort($models);

        return array_values($models);
    }

    /**
     * Remove empty optional values so we never send nulls upstream.
     */
    protected function compact(array $body): array
    {
        return array_filter($body, fn ($value) => !is_null($value) && $value !== []);
    }
}
