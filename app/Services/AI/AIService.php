<?php

namespace Everest\Services\AI;

use Illuminate\Support\Facades\Cache;
use Everest\Services\AI\Data\AIMessage;
use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Http\AIHttpClient;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Exceptions\AIConfigurationException;

/**
 * The single entry point for every AI feature in the panel. It resolves the
 * configured provider, applies admin overrides, performs model routing/model
 * discovery, and exposes both one-shot and streaming calls.
 */
class AIService
{
    public function __construct(
        protected readonly AIProviderRegistry $registry,
        protected readonly AIHttpClient $http,
    ) {
    }

    public function registry(): AIProviderRegistry
    {
        return $this->registry;
    }

    public function selectedProviderId(?string $providerId = null): string
    {
        $id = $providerId ?: (string) config('modules.ai.provider');

        if ($id === '') {
            $id = (string) config('ai.default_provider', 'google_ai_studio') ?: 'google_ai_studio';
        }

        if (!$this->registry->has($id)) {
            if ($providerId) {
                throw new AIConfigurationException(sprintf('Unknown AI provider [%s].', $id));
            }

            // A stale saved value must not take the whole AI page down; fall back
            // to the configured default provider instead.
            $id = (string) config('ai.default_provider', 'google_ai_studio') ?: 'google_ai_studio';
        }

        return $id;
    }

    /**
     * Metadata for the admin provider picker. Secrets are never included.
     */
    public function catalog(): array
    {
        $selected = $this->selectedProviderId();
        $catalog = [];

        foreach (array_keys($this->registry->definitions()) as $id) {
            try {
                $provider = $this->registry->provider(
                    $id,
                    null,
                    $id === $selected ? $this->overrides($id) : []
                );
            } catch (\Throwable) {
                continue;
            }

            $catalog[] = $provider->publicDescription() + ['selected' => $id === $selected];
        }

        return $catalog;
    }

    public function provider(?string $providerId = null): AIProvider
    {
        $id = $this->selectedProviderId($providerId);

        return $this->registry->provider($id, null, $this->overrides($id));
    }

    public function chat(UnifiedRequest $request, ?string $providerId = null): UnifiedResponse
    {
        $id = $this->selectedProviderId($providerId);
        $model = $this->model($request, $id);
        $adapter = $this->registry->adapter($id, $model, $this->overrides($id));
        $this->assertCredentials($adapter->provider());

        $request = $request->withModel($model)->withStream(false);
        $httpRequest = $adapter->buildRequest($request);
        $response = $this->http->send($httpRequest);

        return $adapter->parseResponse($response);
    }

    /**
     * @return \Generator<Data\AIStreamEvent>
     */
    public function stream(UnifiedRequest $request, ?string $providerId = null): \Generator
    {
        $id = $this->selectedProviderId($providerId);
        $model = $this->model($request, $id);
        $adapter = $this->registry->adapter($id, $model, $this->overrides($id));
        $this->assertCredentials($adapter->provider());

        $request = $request->withModel($model)->withStream(true);
        $httpRequest = $adapter->buildRequest($request);
        $decoder = $adapter->createStreamDecoder();

        foreach ($this->http->stream($httpRequest) as $chunk) {
            foreach ($decoder->push($chunk->event, $chunk->data) as $event) {
                yield $event;
            }
        }

        yield Data\AIStreamEvent::complete($decoder->result());
    }

    /**
     * Live model discovery with a cache and a configured fallback.
     */
    public function models(?string $providerId = null, bool $refresh = false): array
    {
        $id = $this->selectedProviderId($providerId);
        $provider = $this->registry->provider($id, null, $this->overrides($id));

        if (!($provider->models['enabled'] ?? false)) {
            return [
                'provider' => $id,
                'base_url' => $provider->baseUrl,
                'source' => 'fallback',
                'models' => $this->fallbackModels($provider),
            ];
        }

        $cacheKey = $this->modelsCacheKey($provider);

        if (!$refresh && Cache::has($cacheKey)) {
            return [
                'provider' => $id,
                'base_url' => $provider->baseUrl,
                'source' => 'cache',
                'models' => Cache::get($cacheKey, []),
            ];
        }

        $adapter = $this->registry->adapterForProvider($provider);
        $this->assertCredentials($provider);

        $response = $this->http->send($adapter->buildModelsRequest());
        $models = $adapter->parseModels($response);

        $source = 'live';
        if ($models === []) {
            $models = $this->fallbackModels($provider);
            $source = 'fallback';
        }

        $ttl = (int) ($provider->models['cache_ttl'] ?? config('ai.models_cache_ttl', 3600));
        if ($ttl > 0) {
            Cache::put($cacheKey, $models, $ttl);
        }

        return [
            'provider' => $id,
            'base_url' => $provider->baseUrl,
            'source' => $source,
            'models' => $models,
        ];
    }

    public function flushModels(?string $providerId = null): void
    {
        $ids = $providerId ? [$providerId] : array_keys($this->registry->definitions());

        foreach ($ids as $id) {
            try {
                $provider = $this->registry->provider($id, null, $this->overrides($id));
            } catch (\Throwable) {
                continue;
            }
            Cache::forget($this->modelsCacheKey($provider));
        }
    }

    public function legacyChat(string $query, ?string $system = null, ?string $providerId = null): UnifiedResponse
    {
        $request = new UnifiedRequest(
            messages: [AIMessage::user($query)],
            system: $system ?: (string) config('modules.ai.system_prompt'),
            maxTokens: (int) config('modules.ai.max_tokens', 1024),
            temperature: (float) config('modules.ai.temperature', 0.7),
        );

        return $this->chat($request, $providerId);
    }

    protected function model(UnifiedRequest $request, string $providerId): ?string
    {
        if ($request->model) {
            return $request->model;
        }

        $configured = trim((string) config('modules.ai.model'));
        if ($configured !== '') {
            return $configured;
        }

        return $this->registry->definition($providerId)['default_model'] ?? null;
    }

    protected function overrides(string $providerId): array
    {
        $overrides = [];

        $baseUrl = trim((string) config('modules.ai.base_url'));
        if ($baseUrl !== '') {
            $overrides['base_url'] = $baseUrl;
        }

        $key = trim((string) config('modules.ai.key'));
        if ($key !== '') {
            $overrides['auth'] = ['token' => $key];
        }

        $headers = config('modules.ai.headers');
        if (is_string($headers) && trim($headers) !== '') {
            $headers = json_decode($headers, true);
        }
        if (is_array($headers) && $headers !== []) {
            $overrides['headers'] = $headers;
        }

        return $overrides;
    }

    protected function assertCredentials(AIProvider $provider): void
    {
        if (!$provider->requiresKey() || $provider->hasToken()) {
            return;
        }

        throw new AIConfigurationException(sprintf('AI provider [%s] requires an API key or token. Configure it in the AI module settings or set the provider-specific environment variable.', $provider->id));
    }

    protected function modelsCacheKey(AIProvider $provider): string
    {
        return 'ai:models:' . sha1(implode('|', [
            $provider->id,
            $provider->baseUrl,
            $provider->driver,
            (string) ($provider->models['path'] ?? ''),
            (string) ($provider->auth['token'] ?? ''),
        ]));
    }

    protected function fallbackModels(AIProvider $provider): array
    {
        $models = [];
        foreach ((array) ($provider->models['fallback'] ?? []) as $model) {
            if (is_string($model) && $model !== '') {
                $models[] = ['id' => $model, 'name' => $model];
            } elseif (is_array($model) && !empty($model['id'])) {
                $models[] = [
                    'id' => (string) $model['id'],
                    'name' => (string) ($model['name'] ?? $model['id']),
                ];
            }
        }

        return $models;
    }
}
