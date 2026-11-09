<?php

namespace Everest\Services\AI\Stream;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIStreamEvent;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;

class OllamaStreamDecoder implements StreamDecoder
{
    protected string $text = '';
    protected array $toolCalls = [];
    protected array $usage = [];
    protected string $finishReason = 'stop';
    protected ?string $model = null;

    public function __construct(protected readonly AIProvider $provider)
    {
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

        $events = [];
        $this->model ??= is_string($json['model'] ?? null) ? $json['model'] : null;

        $message = is_array($json['message'] ?? null) ? $json['message'] : [];
        $text = (string) ($message['content'] ?? '');
        if ($text !== '') {
            $this->text .= $text;
            $events[] = AIStreamEvent::text($text);
        }

        foreach ((array) ($message['tool_calls'] ?? []) as $call) {
            if (!is_array($call)) {
                continue;
            }
            $function = is_array($call['function'] ?? null) ? $call['function'] : [];
            $this->toolCalls[] = [
                'id' => (string) ($call['id'] ?? 'call_' . count($this->toolCalls)),
                'name' => (string) ($function['name'] ?? ''),
                'arguments' => DataAccess::decodeJson($function['arguments'] ?? []),
            ];
            $events[] = AIStreamEvent::toolCall(end($this->toolCalls));
        }

        if (isset($json['prompt_eval_count']) || isset($json['eval_count'])) {
            $this->usage = DataAccess::normalizeUsage([
                'prompt_eval_count' => $json['prompt_eval_count'] ?? null,
                'eval_count' => $json['eval_count'] ?? null,
            ]);
        }

        if (($json['done'] ?? false) === true) {
            $this->finishReason = (string) ($json['done_reason'] ?? 'stop') ?: 'stop';
            $events[] = AIStreamEvent::usage($this->usage);
            $events[] = AIStreamEvent::done($this->finishReason);
        }

        return $events;
    }

    public function result(): UnifiedResponse
    {
        return new UnifiedResponse(
            text: $this->text,
            toolCalls: $this->toolCalls,
            finishReason: $this->finishReason,
            usage: $this->usage,
            model: $this->model,
            provider: $this->provider->id,
        );
    }
}
