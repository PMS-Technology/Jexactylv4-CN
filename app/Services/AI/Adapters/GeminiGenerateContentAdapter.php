<?php

namespace Everest\Services\AI\Adapters;

use Everest\Services\AI\Data\AITool;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Support\DataAccess;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Contracts\StreamDecoder;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Stream\GeminiStreamDecoder;
use Everest\Services\AI\Exceptions\AIProviderException;

/**
 * Google generateContent protocol: AI Studio and Vertex AI use this shape.
 */
class GeminiGenerateContentAdapter extends AbstractAdapter
{
    public function buildRequest(UnifiedRequest $request): AIHttpRequest
    {
        $body = $this->buildBody($request);
        $stream = $request->stream;

        return $this->buildHttpRequest(
            'POST',
            $this->url($stream && isset($this->provider->paths['stream']) ? 'stream' : 'generate', $request),
            $body,
            $stream,
        );
    }

    protected function buildBody(UnifiedRequest $request): array
    {
        $body = [
            'contents' => $this->contents($request),
        ];

        if ($request->system) {
            $body['systemInstruction'] = ['parts' => [['text' => $request->system]]];
        }

        $generation = array_filter([
            'maxOutputTokens' => $request->maxTokens,
            'temperature' => $request->temperature,
            'responseMimeType' => $this->provider->option('response_mime_type'),
        ], fn ($value) => !is_null($value));

        $body['generationConfig'] = $generation;

        if ($request->tools !== []) {
            $body['tools'] = [[
                'functionDeclarations' => array_map(fn (AITool $tool) => [
                    'name' => $tool->name,
                    'description' => $tool->description,
                    'parameters' => $tool->parameters ?: ['type' => 'object', 'properties' => new \stdClass()],
                ], $request->tools),
            ]];
        }

        return $body;
    }

    protected function contents(UnifiedRequest $request): array
    {
        $contents = [];

        foreach ($request->messages as $message) {
            $role = match ($message->role) {
                'assistant' => 'model',
                default => 'user',
            };

            $parts = [];
            if ($message->role === 'tool') {
                $decoded = DataAccess::decodeJson($message->content);
                $parts[] = [
                    'functionResponse' => [
                        'name' => $message->name ?: (string) $message->toolCallId,
                        'response' => $decoded !== [] ? $decoded : ['result' => $message->content],
                    ],
                ];
            } else {
                if ($message->content !== '') {
                    $parts[] = ['text' => $message->content];
                }
                foreach ($message->images as $image) {
                    $part = $this->imagePart($image);
                    if ($part !== null) {
                        $parts[] = $part;
                    }
                }
                foreach ($message->toolCalls as $call) {
                    $parts[] = [
                        'functionCall' => [
                            'name' => (string) ($call['name'] ?? ''),
                            'args' => $call['arguments'] ?? new \stdClass(),
                        ],
                    ];
                }
            }

            if ($parts === []) {
                continue;
            }

            $last = array_key_last($contents);
            if ($last !== null && $contents[$last]['role'] === $role) {
                $contents[$last]['parts'] = array_merge($contents[$last]['parts'], $parts);
                continue;
            }

            $contents[] = ['role' => $role, 'parts' => $parts];
        }

        return $contents;
    }

    protected function imagePart(array $image): ?array
    {
        if (!empty($image['data'])) {
            return [
                'inlineData' => [
                    'mimeType' => $image['media_type'] ?? 'image/png',
                    'data' => (string) $image['data'],
                ],
            ];
        }

        if (!empty($image['url'])) {
            return [
                'fileData' => [
                    'mimeType' => $image['media_type'] ?? 'image/png',
                    'fileUri' => (string) $image['url'],
                ],
            ];
        }

        return null;
    }

    public function parseResponse(AIUpstreamResponse $response): UnifiedResponse
    {
        $data = $this->unwrap($response->json());

        if (isset($data['error']) && empty($data['candidates'])) {
            throw new AIProviderException(status: $response->status >= 400 ? $response->status : 502, body: $response->body, contentType: $response->contentType(), provider: $this->provider->id);
        }

        $candidate = $data['candidates'][0] ?? [];
        $candidate = is_array($candidate) ? $candidate : [];
        $parts = (array) DataAccess::get($candidate, 'content.parts', []);

        $text = '';
        $toolCalls = [];
        foreach ($parts as $index => $part) {
            if (!is_array($part)) {
                continue;
            }
            if (isset($part['text']) && is_string($part['text'])) {
                $text .= $part['text'];
            } elseif (isset($part['functionCall']) && is_array($part['functionCall'])) {
                $toolCalls[] = [
                    'id' => 'call_' . $index,
                    'name' => (string) ($part['functionCall']['name'] ?? ''),
                    'arguments' => is_array($part['functionCall']['args'] ?? null) ? $part['functionCall']['args'] : [],
                ];
            }
        }

        $finish = (string) ($candidate['finishReason'] ?? 'STOP');
        $blocked = DataAccess::get($data, 'promptFeedback.blockReason', null);
        if ($blocked) {
            $finish = 'SAFETY';
        }

        return new UnifiedResponse(
            text: $text,
            toolCalls: $toolCalls,
            finishReason: $this->finishReason($finish),
            usage: DataAccess::normalizeUsage((array) ($data['usageMetadata'] ?? [])),
            raw: $data,
            model: is_string($data['modelVersion'] ?? null) ? $data['modelVersion'] : null,
            id: is_string($data['responseId'] ?? null) ? $data['responseId'] : null,
            provider: $this->provider->id,
        );
    }

    protected function unwrap(array $data): array
    {
        return $data;
    }

    protected function finishReason(string $reason): string
    {
        return match ($reason) {
            'MAX_TOKENS' => 'length',
            'SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII' => 'content_filter',
            'MALFORMED_FUNCTION_CALL' => 'error',
            default => 'stop',
        };
    }

    public function createStreamDecoder(): StreamDecoder
    {
        return new GeminiStreamDecoder($this->provider, fn (string $reason) => $this->finishReason($reason));
    }
}
