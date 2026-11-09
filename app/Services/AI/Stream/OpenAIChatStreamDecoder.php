<?php

namespace Everest\Services\AI\Stream;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIStreamEvent;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;

class OpenAIChatStreamDecoder implements StreamDecoder
{
    protected string $text = '';
    protected array $toolCalls = [];
    protected array $usage = [];
    protected string $finishReason = 'stop';
    protected ?string $model = null;
    protected ?string $id = null;

    public function __construct(protected readonly AIProvider $provider)
    {
    }

    public function push(?string $event, string $data): array
    {
        $data = trim($data);
        if ($data === '' || $data === ':') {
            return [];
        }

        if ($data === '[DONE]') {
            return [AIStreamEvent::done($this->finishReason)];
        }

        $json = json_decode($data, true);
        if (!is_array($json)) {
            return [];
        }

        if (isset($json['error'])) {
            return [AIStreamEvent::error(
                is_string($json['error']) ? $json['error'] : (string) json_encode($json['error'], JSON_UNESCAPED_UNICODE),
                $json
            )];
        }

        $events = [];
        $this->model ??= is_string($json['model'] ?? null) ? $json['model'] : null;
        $this->id ??= is_string($json['id'] ?? null) ? $json['id'] : null;

        if (is_array($json['usage'] ?? null)) {
            $this->usage = DataAccess::normalizeUsage($json['usage']);
            $events[] = AIStreamEvent::usage($this->usage);
        }

        $choice = $json['choices'][0] ?? null;
        if (!is_array($choice)) {
            return $events;
        }

        $delta = is_array($choice['delta'] ?? null) ? $choice['delta'] : ($choice['message'] ?? []);
        $chunk = DataAccess::text($delta['content'] ?? '');
        if ($chunk !== '') {
            $this->text .= $chunk;
            $events[] = AIStreamEvent::text($chunk);
        }

        foreach ((array) ($delta['tool_calls'] ?? []) as $call) {
            if (!is_array($call)) {
                continue;
            }
            $index = (int) ($call['index'] ?? count($this->toolCalls));
            $function = is_array($call['function'] ?? null) ? $call['function'] : [];
            $current = $this->toolCalls[$index] ?? ['id' => '', 'name' => '', 'arguments' => ''];

            if (!empty($call['id'])) {
                $current['id'] = (string) $call['id'];
            }
            if (!empty($function['name'])) {
                $current['name'] = (string) $function['name'];
            }
            if (isset($function['arguments']) && is_string($function['arguments'])) {
                $current['arguments'] .= $function['arguments'];
            }

            $this->toolCalls[$index] = $current;
            $events[] = AIStreamEvent::toolCall([
                'index' => $index,
                'id' => $current['id'],
                'name' => $current['name'],
                'arguments' => $current['arguments'],
            ]);
        }

        if (is_string($choice['finish_reason'] ?? null) && $choice['finish_reason'] !== '') {
            $this->finishReason = $choice['finish_reason'];
        }

        return $events;
    }

    public function result(): UnifiedResponse
    {
        $toolCalls = [];
        foreach ($this->toolCalls as $index => $call) {
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
