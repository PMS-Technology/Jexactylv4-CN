<?php

namespace Everest\Tests\Unit\Services\AI;

use Everest\Services\AI\Http\AIHttpClient;
use Everest\Services\AI\AIProviderRegistry;

class ProviderRoutingTest extends \PHPUnit\Framework\TestCase
{
    public function testModelRoutesSelectDifferentDriversAndKeepFallback(): void
    {
        $registry = $this->registry([
            'opencode' => [
                'label' => 'OpenCode',
                'driver' => 'openai_chat',
                'base_url' => 'https://opencode.example/v1',
                'auth' => ['type' => 'bearer', 'token' => 'token'],
                'paths' => ['chat' => '/chat/completions', 'messages' => '/messages'],
                'routes' => [
                    ['match' => 'claude-*', 'driver' => 'anthropic_messages'],
                    ['match' => 'gpt-5*', 'driver' => 'openai_responses'],
                    ['match' => '*', 'driver' => 'openai_chat'],
                ],
            ],
        ]);

        $this->assertSame('anthropic_messages', $registry->driver('opencode', 'claude-sonnet-4-5'));
        $this->assertSame('openai_responses', $registry->driver('opencode', 'gpt-5-mini'));
        $this->assertSame('openai_chat', $registry->driver('opencode', 'gemini-2.5-pro'));
        $this->assertSame('openai_chat', $registry->driver('opencode', null));

        $provider = $registry->provider('opencode', 'claude-sonnet-4-5');
        $this->assertSame('anthropic_messages', $provider->driver);
        $this->assertSame('https://opencode.example/v1', $provider->baseUrl);
    }

    public function testRouteOverridesAreMergedIntoTheProvider(): void
    {
        $registry = $this->registry([
            'gateway' => [
                'driver' => 'openai_chat',
                'base_url' => 'https://gateway.example',
                'auth' => ['type' => 'bearer', 'token' => 'default'],
                'paths' => ['chat' => '/chat/completions', 'messages' => '/messages'],
                'routes' => [
                    [
                        'match' => 'claude-*',
                        'driver' => 'anthropic_messages',
                        'base_url' => 'https://anthropic.gateway.example',
                        'auth' => ['token' => 'route-token'],
                    ],
                ],
            ],
        ]);

        $provider = $registry->provider('gateway', 'claude-opus-4-1');

        $this->assertSame('anthropic_messages', $provider->driver);
        $this->assertSame('https://anthropic.gateway.example', $provider->baseUrl);
        $this->assertSame('route-token', $provider->auth['token']);
    }

    public function testAddingAProviderIsConfigurationOnly(): void
    {
        $registry = $this->registry([
            'extra' => [
                'label' => 'Extra',
                'driver' => 'ollama_chat',
                'base_url' => 'http://localhost:11434',
                'auth' => ['type' => 'none'],
                'paths' => ['chat' => '/api/chat'],
                'options' => ['requires_key' => false],
            ],
        ]);

        $adapter = $registry->adapter('extra');

        $this->assertSame('extra', $adapter->provider()->id);
        $this->assertFalse($adapter->provider()->requiresKey());
        $this->assertSame('http://localhost:11434/api/chat', $adapter->provider()->url('chat'));
    }

    protected function registry(array $definitions): AIProviderRegistry
    {
        return new class ($definitions) extends AIProviderRegistry {
            public function __construct(private readonly array $definitionsFixture)
            {
                parent::__construct(new AIHttpClient());
            }

            public function definitions(): array
            {
                return $this->definitionsFixture;
            }
        };
    }
}
