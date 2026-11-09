<?php

namespace Everest\Services\AI\Stream;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIStreamEvent;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;

class OpenAICompletionsStreamDecoder implements StreamDecoder
{
    protected string $text = '';
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
        if ($data === '') {
            return [];
        }
        if ($data === '[DONE]') {
            return [AIStreamEvent::done($this->finishReason)];
        }

        $json = json_decode($data, true);
        if (!is_array($json)) {
            return [];
        }

        $events = [];
        $this->model ??= is_string($json['model'] ?? null) ? $json['model'] : null;
        $this->id ??= is_string($json['id'] ?? null) ? $json['id'] : null;

        $choice = $json['choices'][0] ?? [];
        $text = (string) (DataAccess::get($choice, 'text', '') ?? '');
        if ($text !== '') {
            $this->text .= $text;
            $events[] = AIStreamEvent::text($text);
        }

        if (is_string($choice['finish_reason'] ?? null) && $choice['finish_reason'] !== '') {
            $this->finishReason = $choice['finish_reason'];
        }

        if (is_array($json['usage'] ?? null)) {
            $this->usage = DataAccess::normalizeUsage($json['usage']);
            $events[] = AIStreamEvent::usage($this->usage);
        }

        return $events;
    }

    public function result(): UnifiedResponse
    {
        return new UnifiedResponse(
            text: $this->text,
            finishReason: $this->finishReason,
            usage: $this->usage,
            model: $this->model,
            id: $this->id,
            provider: $this->provider->id,
        );
    }
}
