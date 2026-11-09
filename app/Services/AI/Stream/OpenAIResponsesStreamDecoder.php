<?php

namespace Everest\Services\AI\Stream;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIStreamEvent;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;

class OpenAIResponsesStreamDecoder implements StreamDecoder
{
    protected string $text = '';
    protected array $toolCalls = [];
    protected array $usage = [];
    protected string $finishReason = 'stop';
    protected ?string $model = null;
    protected ?string $id = null;
    protected bool $completed = false;

    public function __construct(protected readonly AIProvider $provider)
    {
    }

    public function push(?string $event, string $data): array
    {
        $data = trim($data);
        if ($data === '' || $data === '[DONE]') {
            return $data === '[DONE]' ? [AIStreamEvent::done($this->finishReason)] : [];
        }

        $json = json_decode($data, true);
        if (!is_array($json)) {
            return [];
        }

        $type = (string) ($json['type'] ?? $event ?? '');
        $events = [];

        $this->model ??= is_string($json['model'] ?? null) ? $json['model'] : null;

        switch ($type) {
            case 'response.output_text.delta':
                $delta = (string) ($json['delta'] ?? '');
                if ($delta !== '') {
                    $this->text .= $delta;
                    $events[] = AIStreamEvent::text($delta);
                }
                break;

            case 'response.refusal.delta':
                $delta = (string) ($json['delta'] ?? '');
                if ($delta !== '') {
                    $this->text .= $delta;
                    $events[] = AIStreamEvent::text($delta);
                }
                break;

            case 'response.output_item.added':
            case 'response.output_item.done':
                $item = is_array($json['item'] ?? null) ? $json['item'] : [];
                if (($item['type'] ?? null) === 'function_call') {
                    $key = (string) ($item['id'] ?? $item['call_id'] ?? count($this->toolCalls));
                    $current = $this->toolCalls[$key] ?? ['id' => '', 'name' => '', 'arguments' => ''];
                    $current['id'] = (string) ($item['call_id'] ?? $item['id'] ?? $current['id']);
                    $current['name'] = (string) ($item['name'] ?? $current['name']);
                    if (isset($item['arguments']) && is_string($item['arguments'])) {
                        $current['arguments'] = $item['arguments'];
                    }
                    $this->toolCalls[$key] = $current;
                    $events[] = AIStreamEvent::toolCall([
                        'id' => $current['id'],
                        'name' => $current['name'],
                        'arguments' => $current['arguments'],
                    ]);
                }
                break;

            case 'response.function_call_arguments.delta':
                $key = (string) ($json['item_id'] ?? $json['call_id'] ?? '');
                $current = $this->toolCalls[$key] ?? ['id' => $key, 'name' => '', 'arguments' => ''];
                $current['arguments'] .= (string) ($json['delta'] ?? '');
                $this->toolCalls[$key] = $current;
                $events[] = AIStreamEvent::toolCall([
                    'id' => $current['id'],
                    'name' => $current['name'],
                    'arguments' => $current['arguments'],
                ]);
                break;

            case 'response.completed':
            case 'response.done':
                $response = is_array($json['response'] ?? null) ? $json['response'] : $json;
                $this->absorbResponse($response);
                $events[] = AIStreamEvent::done($this->finishReason);
                break;

            case 'response.failed':
            case 'response.cancelled':
            case 'error':
                $message = DataAccess::get($json, 'response.error.message', DataAccess::get($json, 'error.message', ''));
                if ($message === '' && isset($json['error'])) {
                    $message = is_string($json['error']) ? $json['error'] : (string) json_encode($json['error'], JSON_UNESCAPED_UNICODE);
                }
                $events[] = AIStreamEvent::error($message ?: 'The upstream response failed.', $json);
                $this->finishReason = 'error';
                break;

            default:
                // Some compatible servers omit the event name and wrap the type in `type`
                // only; the switch above still handles those. Anything else is ignored.
                break;
        }

        if (is_array($json['usage'] ?? null)) {
            $this->usage = DataAccess::normalizeUsage($json['usage']);
            $events[] = AIStreamEvent::usage($this->usage);
        }

        return $events;
    }

    protected function absorbResponse(array $response): void
    {
        $this->completed = true;
        $this->id ??= is_string($response['id'] ?? null) ? $response['id'] : null;
        $this->model ??= is_string($response['model'] ?? null) ? $response['model'] : null;

        if (is_array($response['usage'] ?? null)) {
            $this->usage = DataAccess::normalizeUsage($response['usage']);
        }

        $status = (string) ($response['status'] ?? '');
        if ($status === 'incomplete') {
            $this->finishReason = (string) ($response['incomplete_details']['reason'] ?? 'length');
        } elseif (in_array($status, ['failed', 'cancelled'], true)) {
            $this->finishReason = 'error';
        }

        $text = '';
        foreach ((array) ($response['output'] ?? []) as $item) {
            if (!is_array($item)) {
                continue;
            }
            if (($item['type'] ?? null) === 'message') {
                $text .= DataAccess::text($item['content'] ?? []);
            } elseif (($item['type'] ?? null) === 'function_call') {
                $key = (string) ($item['id'] ?? $item['call_id'] ?? count($this->toolCalls));
                $this->toolCalls[$key] = [
                    'id' => (string) ($item['call_id'] ?? $item['id'] ?? ''),
                    'name' => (string) ($item['name'] ?? ''),
                    'arguments' => (string) ($item['arguments'] ?? ''),
                ];
            }
        }

        if ($this->text === '' && $text !== '') {
            $this->text = $text;
        }
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
