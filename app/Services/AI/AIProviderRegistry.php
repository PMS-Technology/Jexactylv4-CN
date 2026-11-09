<?php

namespace Everest\Services\AI;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Http\AIHttpClient;
use Everest\Services\AI\Contracts\ProviderAdapter;
use Everest\Services\AI\Adapters\OllamaChatAdapter;
use Everest\Services\AI\Adapters\OpenAIChatAdapter;
use Everest\Services\AI\Adapters\GeminiInternalAdapter;
use Everest\Services\AI\Adapters\OpenAIResponsesAdapter;
use Everest\Services\AI\Adapters\AnthropicMessagesAdapter;
use Everest\Services\AI\Adapters\OpenAICompletionsAdapter;
use Everest\Services\AI\Exceptions\AIConfigurationException;
use Everest\Services\AI\Adapters\GeminiGenerateContentAdapter;

/**
 * Resolves provider configuration and model-specific routes into a concrete
 * adapter. Upper layers only ever ask for a provider id and a model.
 */
class AIProviderRegistry
{
    /**
     * The complete protocol map. A new wire format needs one class here and one
     * config entry; existing callers are untouched.
     */
    public const DRIVERS = [
        'anthropic_messages' => AnthropicMessagesAdapter::class,
        'openai_chat' => OpenAIChatAdapter::class,
        'openai_responses' => OpenAIResponsesAdapter::class,
        'openai_completions' => OpenAICompletionsAdapter::class,
        'gemini_generate_content' => GeminiGenerateContentAdapter::class,
        'gemini_internal' => GeminiInternalAdapter::class,
        'ollama_chat' => OllamaChatAdapter::class,
    ];

    public function __construct(
        protected readonly AIHttpClient $http,
    ) {
    }

    public function definitions(): array
    {
        return (array) config('ai.providers', []);
    }

    public function has(string $id): bool
    {
        return isset($this->definitions()[$id]);
    }

    public function definition(string $id): array
    {
        $definition = $this->definitions()[$id] ?? null;

        if (!is_array($definition)) {
            throw new AIConfigurationException(sprintf('Unknown AI provider [%s]. Available providers: %s.', $id, implode(', ', array_keys($this->definitions()))));
        }

        return $definition;
    }

    /**
     * First matching route wins. Rules are evaluated against the model name and
     * support `*`/`?` wildcards, e.g. `claude-*` or `gpt-5*`.
     */
    public function route(string $id, ?string $model): array
    {
        $definition = $this->definition($id);

        if (!$model) {
            return [];
        }

        foreach ((array) ($definition['routes'] ?? []) as $route) {
            if (!is_array($route)) {
                continue;
            }
            $pattern = (string) ($route['match'] ?? '*');
            if ($this->matches($pattern, $model)) {
                unset($route['match']);

                return $route;
            }
        }

        return [];
    }

    public function driver(string $id, ?string $model = null): string
    {
        $definition = $this->definition($id);
        $route = $this->route($id, $model);

        return (string) ($route['driver'] ?? $definition['driver'] ?? 'openai_chat');
    }

    public function provider(string $id, ?string $model = null, array $overrides = []): AIProvider
    {
        $definition = $this->definition($id);
        $route = $this->route($id, $model);

        $provider = AIProvider::fromConfig($id, $definition);

        if ($route !== []) {
            $provider = $provider->with(array_intersect_key($route, array_flip([
                'driver', 'base_url', 'auth', 'headers', 'paths', 'models', 'mapping', 'options', 'default_model',
            ])));
        }

        return $provider->with($overrides);
    }

    public function adapter(string $id, ?string $model = null, array $overrides = []): ProviderAdapter
    {
        return $this->adapterForProvider($this->provider($id, $model, $overrides));
    }

    public function adapterForProvider(AIProvider $provider): ProviderAdapter
    {
        $class = self::DRIVERS[$provider->driver] ?? null;

        if (!$class) {
            throw new AIConfigurationException(sprintf('AI driver [%s] used by provider [%s] is not registered.', $provider->driver, $provider->id));
        }

        return new $class($provider);
    }

    protected function matches(string $pattern, string $value): bool
    {
        if ($pattern === '*' || $pattern === $value) {
            return true;
        }

        $regex = '#^' . str_replace(['\*', '\?'], ['.*', '.'], preg_quote($pattern, '#')) . '$#i';

        return (bool) preg_match($regex, $value);
    }
}
