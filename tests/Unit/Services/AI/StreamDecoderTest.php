<?php

namespace Everest\Tests\Unit\Services\AI;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Stream\GeminiStreamDecoder;
use Everest\Services\AI\Stream\OllamaStreamDecoder;
use Everest\Services\AI\Stream\AnthropicStreamDecoder;
use Everest\Services\AI\Stream\OpenAIChatStreamDecoder;
use Everest\Services\AI\Stream\OpenAIResponsesStreamDecoder;

class StreamDecoderTest extends \PHPUnit\Framework\TestCase
{
    public function testOpenAiChatStreamAccumulatesTextAndToolArguments(): void
    {
        $decoder = new OpenAIChatStreamDecoder($this->provider());

        $events = $decoder->push(null, json_encode([
            'choices' => [['delta' => ['content' => 'hel']]],
        ]));
        $this->assertSame('hel', $events[0]->text);

        $decoder->push(null, json_encode([
            'choices' => [['delta' => ['tool_calls' => [[
                'index' => 0,
                'id' => 'call_1',
                'function' => ['name' => 'lookup', 'arguments' => '{"q":"'],
            ]]]]],
        ]));
        $decoder->push(null, json_encode([
            'choices' => [['delta' => ['tool_calls' => [[
                'index' => 0,
                'function' => ['arguments' => 'x"}'],
            ]]], 'finish_reason' => 'tool_calls']],
        ]));
        $done = $decoder->push(null, '[DONE]');
        $this->assertSame('done', $done[0]->type);

        $result = $decoder->result();
        $this->assertSame('hel', $result->text);
        $this->assertSame('lookup', $result->toolCalls[0]['name']);
        $this->assertSame(['q' => 'x'], $result->toolCalls[0]['arguments']);
        $this->assertSame('tool_calls', $result->finishReason);
    }

    public function testAnthropicStreamHandlesTextAndInputJson(): void
    {
        $decoder = new AnthropicStreamDecoder($this->provider(), fn (string $reason) => $reason === 'tool_use' ? 'tool_calls' : 'stop');

        $decoder->push('message_start', json_encode([
            'type' => 'message_start',
            'message' => ['id' => 'msg_1', 'model' => 'claude-test', 'usage' => ['input_tokens' => 3]],
        ]));
        $events = $decoder->push('content_block_delta', json_encode([
            'type' => 'content_block_delta',
            'index' => 0,
            'delta' => ['type' => 'text_delta', 'text' => 'hi'],
        ]));
        $this->assertSame('hi', $events[0]->text);

        $decoder->push('content_block_start', json_encode([
            'type' => 'content_block_start',
            'index' => 1,
            'content_block' => ['type' => 'tool_use', 'id' => 'toolu_1', 'name' => 'lookup'],
        ]));
        $decoder->push('content_block_delta', json_encode([
            'type' => 'content_block_delta',
            'index' => 1,
            'delta' => ['type' => 'input_json_delta', 'partial_json' => '{"q":"x"}'],
        ]));
        $decoder->push('message_delta', json_encode([
            'type' => 'message_delta',
            'delta' => ['stop_reason' => 'tool_use'],
            'usage' => ['output_tokens' => 4],
        ]));

        $result = $decoder->result();
        $this->assertSame('hi', $result->text);
        $this->assertSame(['q' => 'x'], $result->toolCalls[0]['arguments']);
        $this->assertSame('tool_calls', $result->finishReason);
        $this->assertSame(7, $result->usage['total_tokens']);
    }

    public function testGeminiAndResponsesStreams(): void
    {
        $gemini = new GeminiStreamDecoder($this->provider(), fn (string $reason) => $reason === 'MAX_TOKENS' ? 'length' : 'stop');
        $gemini->push(null, json_encode([
            'candidates' => [['content' => ['parts' => [['text' => 'hi']]]]],
            'usageMetadata' => ['promptTokenCount' => 2, 'candidatesTokenCount' => 1],
        ]));
        $gemini->push(null, json_encode([
            'candidates' => [['content' => ['parts' => [['text' => '!']]], 'finishReason' => 'MAX_TOKENS']],
        ]));
        $this->assertSame('hi!', $gemini->result()->text);
        $this->assertSame('length', $gemini->result()->finishReason);

        $responses = new OpenAIResponsesStreamDecoder($this->provider());
        $responses->push('response.output_text.delta', json_encode([
            'type' => 'response.output_text.delta',
            'delta' => 'hello',
        ]));
        $responses->push('response.completed', json_encode([
            'type' => 'response.completed',
            'response' => [
                'id' => 'resp_1',
                'model' => 'gpt-test',
                'status' => 'completed',
                'output' => [['type' => 'message', 'content' => [['type' => 'output_text', 'text' => 'hello']]]],
                'usage' => ['input_tokens' => 2, 'output_tokens' => 1],
            ],
        ]));
        $this->assertSame('hello', $responses->result()->text);
        $this->assertSame(3, $responses->result()->usage['total_tokens']);
    }

    public function testOllamaNdjsonStream(): void
    {
        $decoder = new OllamaStreamDecoder($this->provider());
        $decoder->push(null, json_encode(['message' => ['content' => 'hi'], 'done' => false]));
        $decoder->push(null, json_encode([
            'message' => ['content' => ''],
            'done' => true,
            'done_reason' => 'stop',
            'prompt_eval_count' => 1,
            'eval_count' => 1,
        ]));

        $this->assertSame('hi', $decoder->result()->text);
        $this->assertSame(2, $decoder->result()->usage['total_tokens']);
    }

    protected function provider(): AIProvider
    {
        return AIProvider::fromConfig('test', [
            'label' => 'Test',
            'driver' => 'openai_chat',
            'base_url' => 'https://api.example.test/v1',
            'auth' => ['type' => 'bearer', 'token' => 'token'],
            'paths' => ['chat' => '/chat/completions'],
        ]);
    }
}
