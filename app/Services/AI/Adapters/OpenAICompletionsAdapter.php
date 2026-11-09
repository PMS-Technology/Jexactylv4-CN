<?php

namespace Everest\Services\AI\Adapters;

use Everest\Services\AI\Data\AIMessage;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Stream\OpenAICompletionsStreamDecoder;

/**
 * Legacy /completions protocol (Zed and other prompt-style endpoints). The
 * conversation is flattened into a single prompt using a configurable template.
 */
class OpenAICompletionsAdapter extends AbstractAdapter
{
    public function buildRequest(UnifiedRequest $request): AIHttpRequest
    {
        $body = [
            'model' => $this->model($request),
            'prompt' => $this->prompt($request),
            'max_tokens' => $request->maxTokens,
            'stream' => $request->stream,
        ];

        if ($request->temperature !== null) {
            $body['temperature'] = $request->temperature;
        }

        return $this->buildHttpRequest(
            'POST',
            $this->url($request->stream && isset($this->provider->paths['stream']) ? 'stream' : 'completions', $request),
            $body,
            $request->stream,
        );
    }

    protected function prompt(UnifiedRequest $request): string
    {
        $format = (string) ($this->provider->mapping['prompt_format'] ?? 'plain');
        $prompt = '';

        if ($request->system) {
            $prompt .= $format === 'chatml'
                ? "<|im_start|>system\n{$request->system}<|im_end|>\n"
                : "System: {$request->system}\n\n";
        }

        foreach ($request->messages as $message) {
            $prompt .= $this->messagePrompt($message, $format);
        }

        return $prompt . ($format === 'chatml' ? '<|im_start|>assistant' : 'Assistant:');
    }

    protected function messagePrompt(AIMessage $message, string $format): string
    {
        $label = match ($message->role) {
            'assistant' => 'Assistant',
            'tool' => 'Tool',
            default => 'User',
        };

        $content = $message->content;

        if ($format === 'chatml') {
            $role = $message->role === 'tool' ? 'tool' : $message->role;

            return "<|im_start|>{$role}\n{$content}<|im_end|>\n";
        }

        return "{$label}: {$content}\n";
    }

    public function parseResponse(AIUpstreamResponse $response): UnifiedResponse
    {
        $data = $response->json();
        $choice = $data['choices'][0] ?? [];

        return new UnifiedResponse(
            text: (string) (DataAccess::get($choice, 'text', '') ?? ''),
            toolCalls: [],
            finishReason: (string) (DataAccess::get($choice, 'finish_reason', 'stop') ?: 'stop'),
            usage: DataAccess::normalizeUsage((array) ($data['usage'] ?? [])),
            raw: $data,
            model: is_string($data['model'] ?? null) ? $data['model'] : null,
            id: is_string($data['id'] ?? null) ? $data['id'] : null,
            provider: $this->provider->id,
        );
    }

    public function createStreamDecoder(): StreamDecoder
    {
        return new OpenAICompletionsStreamDecoder($this->provider);
    }
}
