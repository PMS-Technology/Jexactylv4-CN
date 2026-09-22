<?php

namespace Everest\Tests\Unit\Services\AI;

use Everest\Tests\TestCase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Everest\Services\AI\AIProviderService;

class AIProviderServiceTest extends TestCase
{
    public function testAnthropicMessagesRequest(): void
    {
        $this->configure('anthropic_messages', 'claude-sonnet-4-6', 'secret');
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['type' => 'text', 'text' => 'answer']],
            ]),
        ]);

        $this->assertSame('answer', app(AIProviderService::class)->query('question'));
        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://api.anthropic.com/v1/messages'
                && $request->hasHeader('x-api-key', 'secret')
                && $request['model'] === 'claude-sonnet-4-6'
                && $request['messages'][0]['content'] === 'question';
        });
    }

    public function testOpenCodeZenRoutesGeminiModels(): void
    {
        $this->configure('opencode_zen', 'gemini-3.8-flash', 'secret');
        Http::fake([
            'opencode.ai/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => 'one'], ['text' => ' two']]]]],
            ]),
        ]);

        $this->assertSame('one two', app(AIProviderService::class)->query('question'));
        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://opencode.ai/zen/v1/models/gemini-3.8-flash:generateContent'
                && $request->hasHeader('Authorization', 'Bearer secret')
                && $request->hasHeader('x-opencode-session');
        });
    }

    public function testOpenCodeGoRoutesMessagesAndResponsesModels(): void
    {
        Http::fake(function (Request $request) {
            if (str_ends_with($request->url(), '/messages')) {
                return Http::response(['content' => [['type' => 'text', 'text' => 'messages']]]);
            }

            return Http::response(['output' => [['content' => [['type' => 'output_text', 'text' => 'responses']]]]]);
        });

        $this->configure('opencode_go', 'qwen3.8-max', 'secret');
        $this->assertSame('messages', app(AIProviderService::class)->query('question'));

        $this->configure('opencode_go', 'gpt-5.6-luna', 'secret');
        $this->assertSame('responses', app(AIProviderService::class)->query('question'));

        Http::assertSent(fn (Request $request) => str_ends_with($request->url(), '/messages'));
        Http::assertSent(fn (Request $request) => str_ends_with($request->url(), '/responses'));
    }

    public function testOllamaModelSynchronization(): void
    {
        $this->configure('ollama_chat', 'qwen3', '');
        Http::fake([
            'localhost:11434/*' => Http::response([
                'models' => [['name' => 'qwen3'], ['name' => 'llama3.2']],
            ]),
        ]);

        $this->assertSame(['llama3.2', 'qwen3'], app(AIProviderService::class)->models());
        Http::assertSent(fn (Request $request) => $request->url() === 'http://localhost:11434/api/tags');
    }

    public function testCopilotUsesSynchronizedEndpointCapabilities(): void
    {
        $this->configure('github_copilot', 'claude-sonnet-4.6', 'secret');
        config()->set(
            'modules.ai.model_routes',
            json_encode(['github_copilot' => ['claude-sonnet-4.6' => 'anthropic']])
        );
        Http::fake([
            'api.githubcopilot.com/*' => Http::response([
                'content' => [['type' => 'text', 'text' => 'answer']],
            ]),
        ]);

        $this->assertSame('answer', app(AIProviderService::class)->query('question'));
        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://api.githubcopilot.com/v1/messages'
                && $request->hasHeader('Authorization', 'Bearer secret')
                && !$request->hasHeader('x-api-key');
        });
    }

    public function testCommandCodeUsesOfficialProviderApiAndBearerModelSync(): void
    {
        $this->configure('command_code', 'gpt-5', 'secret');
        Http::fake([
            'api.commandcode.ai/provider/v1/models' => Http::response([
                'data' => [[
                    'id' => 'gpt-5',
                    'supported_endpoints' => ['/responses'],
                ]],
            ]),
        ]);

        $provider = app(AIProviderService::class);
        $this->assertSame(['gpt-5'], $provider->models());
        $this->assertSame(['gpt-5' => 'responses'], $provider->modelRoutes());
        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://api.commandcode.ai/provider/v1/models'
                && $request->hasHeader('Authorization', 'Bearer secret')
                && !$request->hasHeader('x-api-key');
        });
    }

    public function testCodexResponseStreamIsCombined(): void
    {
        $this->configure('openai_codex', 'gpt-5-codex', 'secret');
        Http::fake([
            'chatgpt.com/*' => Http::response(
                "data: {\"type\":\"response.output_text.delta\",\"delta\":\"hello \"}\n\n"
                . "data: {\"type\":\"response.output_text.delta\",\"delta\":\"world\"}\n\n"
                . "data: [DONE]\n\n"
            ),
        ]);

        $this->assertSame('hello world', app(AIProviderService::class)->query('question'));
        Http::assertSent(fn (Request $request) => $request['stream'] === true && $request['store'] === false);
    }

    public function testZedWrappedStreamIsCombined(): void
    {
        $this->configure('zed', 'gpt-5', 'secret', 'https://llm.zed.example');
        Http::fake([
            'llm.zed.example/*' => Http::response(
                "{\"event\":{\"choices\":[{\"delta\":{\"content\":\"hello \"}}]}}\n"
                . "{\"event\":{\"choices\":[{\"delta\":{\"content\":\"world\"}}]}}\n"
            ),
        ]);

        $this->assertSame('hello world', app(AIProviderService::class)->query('question'));
    }

    private function configure(string $format, string $model, string $key, string $baseUrl = ''): void
    {
        config()->set('modules.ai.format', $format);
        config()->set('modules.ai.model', $model);
        config()->set('modules.ai.key', $key);
        config()->set('modules.ai.base_url', $baseUrl);
    }
}
