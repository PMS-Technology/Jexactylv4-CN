<?php

namespace Everest\Services\AI\Stream;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIStreamEvent;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;

class AnthropicStreamDecoder implements StreamDecoder
{
    protected string $text = '';
    protected array $tools = [];
    protected array $usage = [];
    protected string $finishReason = 'stop';
    protected ?string $model = null;
    protected ?string $id = null;

    public function __construct(
        protected readonly AIProvider $provider,
        protected readonly \Closure $finishMapper,
    ) {
    }

    public function push(?string $event, string $data): array
    {
        $data = trim($data);
        if ($data === '') {
            return [];
        }

        $json = json_decode($data, true);
        if (!is_array($json)) {
            return [];
        }

        $type = (string) ($json['type'] ?? $event ?? '');
        $events = [];

        switch ($type) {
            case 'message_start':
                $message = is_array($json['message'] ?? null) ? $json['message'] : [];
                $this->id = is_string($message['id'] ?? null) ? $message['id'] : $this->id;
                $this->model = is_string($message['model'] ?? null) ? $message['model'] : $this->model;
                $this->usage = array_filter([
                    'prompt_tokens' => $message['usage']['input_tokens'] ?? null,
                    'completion_tokens' => $message['usage']['output_tokens'] ?? null,
                ], fn ($value) => !is_null($value));
                if ($this->usage !== []) {
                    $events[] = AIStreamEvent::usage($this->usage);
                }
                break;

            case 'content_block_start':
                $index = (int) ($json['index'] ?? 0);
                $block = is_array($json['content_block'] ?? null) ? $json['content_block'] : [];
                if (($block['type'] ?? null) === 'tool_use') {
                    $this->tools[$index] = [
                        'id' => (string) ($block['id'] ?? ''),
                        'name' => (string) ($block['name'] ?? ''),
                        'arguments' => '',
                    ];
                }
                break;

            case 'content_block_delta':
                $index = (int) ($json['index'] ?? 0);
                $delta = is_array($json['delta'] ?? null) ? $json['delta'] : [];
                if (($delta['type'] ?? null) === 'text_delta') {
                    $text = (string) ($delta['text'] ?? '');
                    if ($text !== '') {
                        $this->text .= $text;
                        $events[] = AIStreamEvent::text($text);
                    }
                } elseif (($delta['type'] ?? null) === 'input_json_delta') {
                    if (!isset($this->tools[$index])) {
                        $this->tools[$index] = ['id' => '', 'name' => '', 'arguments' => ''];
                    }
                    $this->tools[$index]['arguments'] .= (string) ($delta['partial_json'] ?? '');
                    $events[] = AIStreamEvent::toolCall([
                        'index' => $index,
                        'id' => $this->tools[$index]['id'],
                        'name' => $this->tools[$index]['name'],
                        'arguments' => $this->tools[$index]['arguments'],
                    ]);
                }
                break;

            case 'content_block_stop':
                $index = (int) ($json['index'] ?? 0);
                if (isset($this->tools[$index])) {
                    $events[] = AIStreamEvent::toolCall([
                        'index' => $index,
                        'id' => $this->tools[$index]['id'],
                        'name' => $this->tools[$index]['name'],
                        'arguments' => $this->tools[$index]['arguments'],
                        'done' => true,
                    ]);
                }
                break;

            case 'message_delta':
                $delta = is_array($json['delta'] ?? null) ? $json['delta'] : [];
                if (is_string($delta['stop_reason'] ?? null) && $delta['stop_reason'] !== '') {
                    $this->finishReason = ($this->finishMapper)($delta['stop_reason']);
                }
                if (isset($json['usage']['output_tokens'])) {
                    $this->usage['completion_tokens'] = (int) $json['usage']['output_tokens'];
                    $this->usage['total_tokens'] = ($this->usage['prompt_tokens'] ?? 0) + $this->usage['completion_tokens'];
                    $events[] = AIStreamEvent::usage($this->usage);
                }
                break;

            case 'message_stop':
                $events[] = AIStreamEvent::done($this->finishReason);
                break;

            case 'error':
                $message = DataAccess::get($json, 'error.message', DataAccess::get($json, 'error', 'The upstream response failed.'));
                $events[] = AIStreamEvent::error(is_string($message) ? $message : (string) json_encode($message), $json);
                $this->finishReason = 'error';
                break;
        }

        return $events;
    }

    public function result(): UnifiedResponse
    {
        $toolCalls = [];
        foreach ($this->tools as $index => $call) {
            $toolCalls[] = [
                'id' => $call['id'] !== '' ? $call['id'] : 'call_' . $index,
                'name' => $call['name'],
                'arguments' => DataAccess::decodeJson($call['arguments']),
            ];
        }

        return new UnifiedResponse(
            text: $this->text,
            toolCalls: $toolCalls,
            finishReason: $this->finishReason,
            usage: $this->usage,
            model: $this->model,
            id: $this->id,
            provider: $this->provider->id,
        );
    }
}
