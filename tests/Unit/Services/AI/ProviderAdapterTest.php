<?php

namespace Everest\Tests\Unit\Services\AI;

use Everest\Services\AI\Data\AITool;
use Everest\Services\AI\Data\AIMessage;
use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Adapters\OllamaChatAdapter;
use Everest\Services\AI\Adapters\OpenAIChatAdapter;
use Everest\Services\AI\Adapters\GeminiInternalAdapter;
use Everest\Services\AI\Adapters\OpenAIResponsesAdapter;
use Everest\Services\AI\Adapters\AnthropicMessagesAdapter;
use Everest\Services\AI\Adapters\OpenAICompletionsAdapter;
use Everest\Services\AI\Adapters\GeminiGenerateContentAdapter;

class ProviderAdapterTest extends \PHPUnit\Framework\TestCase
{
    public function testOpenAiChatBuildsUnifiedRequestAndParsesResponse(): void
    {
        $adapter = new OpenAIChatAdapter($this->provider([
            'paths' => ['chat' => '/chat/completions'],
        ]));

        $request = $this->request();
        $http = $adapter->buildRequest($request);

        $this->assertSame('https://api.example.test/v1/chat/completions', $http->url);
        $this->assertSame('Bearer test-token', $http->headers['Authorization']);
        $this->assertSame('test-model', $http->body['model']);
        $this->assertSame(512, $http->body['max_tokens']);
        $this->assertSame(0.3, $http->body['temperature']);
        $this->assertSame('system prompt', $http->body['messages'][0]['content']);
        $this->assertStringStartsWith('data:image/png;base64,', $http->body['messages'][1]['content'][1]['image_url']['url']);
        $this->assertSame('call_1', $http->body['messages'][2]['tool_calls'][0]['id']);
        $this->assertSame('tool output', $http->body['messages'][3]['content']);
        $this->assertSame('lookup', $http->body['tools'][0]['function']['name']);

        $response = $adapter->parseResponse(new AIUpstreamResponse(200, [], json_encode([
            'id' => 'resp_1',
            'model' => 'gpt-test',
            'choices' => [[
                'message' => [
                    'content' => 'hello',
                    'tool_calls' => [[
                        'id' => 'call_2',
                        'function' => ['name' => 'lookup', 'arguments' => '{"q":"x"}'],
                    ]],
                ],
                'finish_reason' => 'tool_calls',
            ]],
            'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 4, 'total_tokens' => 14],
        ])));

        $this->assertSame('hello', $response->text);
        $this->assertSame('lookup', $response->toolCalls[0]['name']);
        $this->assertSame(['q' => 'x'], $response->toolCalls[0]['arguments']);
        $this->assertSame(14, $response->usage['total_tokens']);
        $this->assertSame('tool_calls', $response->finishReason);
    }

    public function testAnthropicBuildsBlocksAndParsesToolUse(): void
    {
        $adapter = new AnthropicMessagesAdapter($this->provider([
            'driver' => 'anthropic_messages',
            'base_url' => 'https://api.anthropic.com',
            'auth' => ['type' => 'header', 'header' => 'x-api-key', 'token' => 'anthropic-key'],
            'paths' => ['messages' => '/v1/messages'],
        ]));

        $http = $adapter->buildRequest($this->request());

        $this->assertSame('https://api.anthropic.com/v1/messages', $http->url);
        $this->assertSame('anthropic-key', $http->headers['x-api-key']);
        $this->assertSame('system prompt', $http->body['system']);
        $this->assertSame('user', $http->body['messages'][0]['role']);
        $this->assertSame('text', $http->body['messages'][0]['content'][0]['type']);
        $this->assertSame('base64', $http->body['messages'][0]['content'][1]['source']['type']);
        $this->assertSame('tool_use', $http->body['messages'][1]['content'][0]['type']);
        $this->assertSame('tool_result', $http->body['messages'][2]['content'][0]['type']);

        $response = $adapter->parseResponse(new AIUpstreamResponse(200, [], json_encode([
            'id' => 'msg_1',
            'model' => 'claude-test',
            'content' => [
                ['type' => 'text', 'text' => 'hi'],
                ['type' => 'tool_use', 'id' => 'toolu_1', 'name' => 'lookup', 'input' => ['q' => 'x']],
            ],
            'stop_reason' => 'tool_use',
            'usage' => ['input_tokens' => 8, 'output_tokens' => 3],
        ])));

        $this->assertSame('hi', $response->text);
        $this->assertSame('tool_calls', $response->finishReason);
        $this->assertSame(['q' => 'x'], $response->toolCalls[0]['arguments']);
        $this->assertSame(11, $response->usage['total_tokens']);
    }

    public function testGeminiAndInternalEnvelope(): void
    {
        $provider = $this->provider([
            'driver' => 'gemini_generate_content',
            'base_url' => 'https://generativelanguage.googleapis.com',
            'auth' => ['type' => 'query', 'param' => 'key', 'token' => 'gemini-key'],
            'paths' => ['generate' => '/v1beta/models/{model}:generateContent'],
        ]);
        $adapter = new GeminiGenerateContentAdapter($provider);

        $http = $adapter->buildRequest($this->request());

        $this->assertStringContainsString('test-model:generateContent?key=gemini-key', $http->url);
        $this->assertSame('system prompt', $http->body['systemInstruction']['parts'][0]['text']);
        $this->assertSame('user', $http->body['contents'][0]['role']);
        $this->assertArrayHasKey('inlineData', $http->body['contents'][0]['parts'][1]);
        $this->assertArrayHasKey('functionCall', $http->body['contents'][1]['parts'][0]);
        $this->assertArrayHasKey('functionResponse', $http->body['contents'][2]['parts'][0]);

        $payload = [
            'candidates' => [[
                'content' => ['parts' => [
                    ['text' => 'hello'],
                    ['functionCall' => ['name' => 'lookup', 'args' => ['q' => 'x']]],
                ]],
                'finishReason' => 'STOP',
            ]],
            'usageMetadata' => ['promptTokenCount' => 5, 'candidatesTokenCount' => 7],
        ];

        $response = $adapter->parseResponse(new AIUpstreamResponse(200, [], json_encode($payload)));
        $this->assertSame('hello', $response->text);
        $this->assertSame(['q' => 'x'], $response->toolCalls[0]['arguments']);
        $this->assertSame(12, $response->usage['total_tokens']);

        $internal = new GeminiInternalAdapter($this->provider([
            'driver' => 'gemini_internal',
            'base_url' => 'https://cloudcode-pa.googleapis.com',
            'auth' => ['type' => 'bearer', 'token' => 'cli-token'],
            'paths' => ['internal' => '/v1internal:generateContent'],
            'mapping' => ['response_envelope' => 'response'],
        ]));

        $internalHttp = $internal->buildRequest($this->request());
        $this->assertSame('test-model', $internalHttp->body['model']);
        $this->assertArrayHasKey('request', $internalHttp->body);

        $wrapped = $internal->parseResponse(new AIUpstreamResponse(200, [], json_encode(['response' => $payload])));
        $this->assertSame('hello', $wrapped->text);
    }

    public function testResponsesApiBuildsInputItemsAndParsesFunctionCalls(): void
    {
        $adapter = new OpenAIResponsesAdapter($this->provider([
            'driver' => 'openai_responses',
            'paths' => ['responses' => '/responses'],
            'mapping' => ['max_tokens_key' => 'max_output_tokens'],
        ]));

        $http = $adapter->buildRequest($this->request());

        $this->assertSame('https://api.example.test/v1/responses', $http->url);
        $this->assertSame('system prompt', $http->body['instructions']);
        $this->assertSame(512, $http->body['max_output_tokens']);
        $this->assertSame('function_call_output', $http->body['input'][2]['type']);
        $this->assertSame('lookup', $http->body['tools'][0]['name']);

        $response = $adapter->parseResponse(new AIUpstreamResponse(200, [], json_encode([
            'id' => 'resp_1',
            'model' => 'gpt-test',
            'status' => 'completed',
            'output' => [
                ['type' => 'message', 'content' => [['type' => 'output_text', 'text' => 'hello']]],
                ['type' => 'function_call', 'call_id' => 'call_9', 'name' => 'lookup', 'arguments' => '{"q":"x"}'],
            ],
            'usage' => ['input_tokens' => 6, 'output_tokens' => 2, 'total_tokens' => 8],
        ])));

        $this->assertSame('hello', $response->text);
        $this->assertSame('call_9', $response->toolCalls[0]['id']);
        $this->assertSame(8, $response->usage['total_tokens']);
    }

    public function testOllamaAndLegacyCompletions(): void
    {
        $ollama = new OllamaChatAdapter($this->provider([
            'driver' => 'ollama_chat',
            'base_url' => 'http://localhost:11434',
            'auth' => ['type' => 'none'],
            'paths' => ['chat' => '/api/chat'],
            'options' => ['requires_key' => false],
        ]));

        $http = $ollama->buildRequest($this->request());
        $this->assertSame('http://localhost:11434/api/chat', $http->url);
        $this->assertSame(['base64-image'], $http->body['messages'][1]['images']);
        $this->assertSame(512, $http->body['options']['num_predict']);

        $response = $ollama->parseResponse(new AIUpstreamResponse(200, [], json_encode([
            'message' => ['content' => 'hello'],
            'done' => true,
            'done_reason' => 'stop',
            'prompt_eval_count' => 3,
            'eval_count' => 2,
        ])));
        $this->assertSame('hello', $response->text);
        $this->assertSame(5, $response->usage['total_tokens']);

        $completions = new OpenAICompletionsAdapter($this->provider([
            'driver' => 'openai_completions',
            'paths' => ['completions' => '/completions'],
            'mapping' => ['prompt_format' => 'plain'],
        ]));
        $legacy = $completions->buildRequest($this->request());
        $this->assertStringContainsString('System: system prompt', $legacy->body['prompt']);
        $this->assertStringContainsString('User: what is this?', $legacy->body['prompt']);
        $this->assertStringEndsWith('Assistant:', $legacy->body['prompt']);

        $parsed = $completions->parseResponse(new AIUpstreamResponse(200, [], json_encode([
            'choices' => [['text' => 'answer', 'finish_reason' => 'stop']],
        ])));
        $this->assertSame('answer', $parsed->text);
    }

    public function testModelListsAreParsedFromDifferentUpstreamShapes(): void
    {
        $openAi = new OpenAIChatAdapter($this->provider([
            'paths' => ['chat' => '/chat/completions', 'models' => '/models'],
            'models' => ['enabled' => true, 'path' => 'models', 'format' => 'openai'],
        ]));
        $request = $openAi->buildModelsRequest();
        $this->assertSame('https://api.example.test/v1/models', $request->url);
        $models = $openAi->parseModels(new AIUpstreamResponse(200, [], json_encode([
            'data' => [
                ['id' => 'gpt-a', 'name' => 'GPT A', 'context_length' => 128000],
                ['id' => 'gpt-b'],
            ],
        ])));
        $this->assertSame('gpt-a', $models[0]['id']);
        $this->assertSame(128000, $models[0]['context']);

        $gemini = new GeminiGenerateContentAdapter($this->provider([
            'driver' => 'gemini_generate_content',
            'paths' => ['generate' => '/v1beta/models/{model}:generateContent', 'models' => '/v1beta/models'],
            'models' => ['enabled' => true, 'path' => 'models', 'format' => 'gemini'],
        ]));
        $models = $gemini->parseModels(new AIUpstreamResponse(200, [], json_encode([
            'models' => [['name' => 'models/gemini-test', 'displayName' => 'Gemini Test', 'inputTokenLimit' => 1000000]],
        ])));
        $this->assertSame('gemini-test', $models[0]['id']);
        $this->assertSame('Gemini Test', $models[0]['name']);
        $this->assertSame(1000000, $models[0]['context']);

        $ollama = new OllamaChatAdapter($this->provider([
            'driver' => 'ollama_chat',
            'paths' => ['chat' => '/api/chat', 'models' => '/api/tags'],
            'models' => ['enabled' => true, 'path' => 'models', 'format' => 'ollama'],
        ]));
        $models = $ollama->parseModels(new AIUpstreamResponse(200, [], json_encode([
            'models' => [['name' => 'llama3.2']],
        ])));
        $this->assertSame('llama3.2', $models[0]['id']);
    }

    public function testVertexBaseUrlTemplateIsResolved(): void
    {
        $provider = $this->provider([
            'base_url' => 'https://{location}-aiplatform.googleapis.com',
            'paths' => ['generate' => '/v1beta1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent'],
            'options' => ['project' => 'demo-project', 'location' => 'europe-west4'],
        ]);

        $url = $provider->url('generate', ['model' => 'gemini-2.5-pro']);

        $this->assertSame(
            'https://europe-west4-aiplatform.googleapis.com/v1beta1/projects/demo-project/locations/europe-west4/publishers/google/models/gemini-2.5-pro:generateContent',
            $url
        );
    }

    protected function request(): UnifiedRequest
    {
        return new UnifiedRequest(
            messages: [
                AIMessage::user('what is this?', [[
                    'data' => 'base64-image',
                    'media_type' => 'image/png',
                ]]),
                AIMessage::assistant('', [[
                    'id' => 'call_1',
                    'name' => 'lookup',
                    'arguments' => ['q' => 'x'],
                ]]),
                AIMessage::tool('call_1', 'tool output', 'lookup'),
            ],
            system: 'system prompt',
            model: 'test-model',
            maxTokens: 512,
            temperature: 0.3,
            tools: [new AITool('lookup', 'Look something up', ['type' => 'object'])],
        );
    }

    protected function provider(array $overrides = []): AIProvider
    {
        return AIProvider::fromConfig('test', array_replace([
            'label' => 'Test',
            'driver' => 'openai_chat',
            'base_url' => 'https://api.example.test/v1',
            'auth' => ['type' => 'bearer', 'token' => 'test-token'],
            'paths' => ['chat' => '/chat/completions', 'responses' => '/responses'],
            'mapping' => ['max_tokens_key' => 'max_tokens'],
            'default_model' => 'gpt-test',
        ], $overrides));
    }
}
