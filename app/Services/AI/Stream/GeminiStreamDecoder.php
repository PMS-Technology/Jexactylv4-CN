<?php

namespace Everest\Services\AI\Stream;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIStreamEvent;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;

class GeminiStreamDecoder implements StreamDecoder
{
    protected string $text = '';
    protected array $toolCalls = [];
    protected array $usage = [];
    protected string $finishReason = 'stop';
    protected ?string $model = null;
    protected ?string $id = null;

    public function __construct(
        protected readonly AIProvider $provider,
        protected readonly \Closure $finishMapper,
        protected readonly string $envelope = '',
    ) {
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

        if ($this->envelope !== '' && is_array($json[$this->envelope] ?? null)) {
            $json = $json[$this->envelope];
        }

        $events = [];
        $this->model ??= is_string($json['modelVersion'] ?? null) ? $json['modelVersion'] : null;
        $this->id ??= is_string($json['responseId'] ?? null) ? $json['responseId'] : null;

        if (is_array($json['usageMetadata'] ?? null)) {
            $this->usage = DataAccess::normalizeUsage($json['usageMetadata']);
            $events[] = AIStreamEvent::usage($this->usage);
        }

        $parts = (array) DataAccess::get($json, 'candidates.0.content.parts', []);
        foreach ($parts as $part) {
            if (!is_array($part)) {
                continue;
            }
            if (isset($part['text']) && is_string($part['text']) && $part['text'] !== '') {
                $this->text .= $part['text'];
                $events[] = AIStreamEvent::text($part['text']);
            } elseif (isset($part['functionCall']) && is_array($part['functionCall'])) {
                $this->toolCalls[] = [
                    'id' => 'call_' . count($this->toolCalls),
                    'name' => (string) ($part['functionCall']['name'] ?? ''),
                    'arguments' => is_array($part['functionCall']['args'] ?? null) ? $part['functionCall']['args'] : [],
                ];
                $events[] = AIStreamEvent::toolCall(end($this->toolCalls));
            }
        }

        $finish = DataAccess::get($json, 'candidates.0.finishReason', null);
        if (is_string($finish) && $finish !== '') {
            $this->finishReason = ($this->finishMapper)($finish);
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
            id: $this->id,
            provider: $this->provider->id,
        );
    }
}
