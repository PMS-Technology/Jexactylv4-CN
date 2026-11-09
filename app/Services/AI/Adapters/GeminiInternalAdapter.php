<?php

namespace Everest\Services\AI\Adapters;

use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Data\UnifiedRequest;

/**
 * Google Cloud Code internal generateContent protocol used by Antigravity and
 * the Gemini CLI. The Gemini body is nested under `request`, and responses are
 * wrapped in `response`.
 */
class GeminiInternalAdapter extends GeminiGenerateContentAdapter
{
    public function buildRequest(UnifiedRequest $request): AIHttpRequest
    {
        $inner = $this->buildBody($request);
        $body = [
            'model' => $this->model($request),
            'request' => $inner,
        ];

        if ($this->provider->option('project')) {
            $body['project'] = $this->provider->option('project');
        }

        foreach ((array) ($this->provider->mapping['extra_body'] ?? []) as $key => $value) {
            $body[$key] = $value;
        }

        $stream = $request->stream;

        return $this->buildHttpRequest(
            'POST',
            $this->url($stream && isset($this->provider->paths['stream']) ? 'stream' : 'internal', $request),
            $body,
            $stream,
        );
    }

    protected function unwrap(array $data): array
    {
        $envelope = (string) ($this->provider->mapping['response_envelope'] ?? 'response');

        if ($envelope !== '' && is_array($data[$envelope] ?? null)) {
            return $data[$envelope];
        }

        return $data;
    }

    public function createStreamDecoder(): \Everest\Services\AI\Contracts\StreamDecoder
    {
        return new \Everest\Services\AI\Stream\GeminiStreamDecoder(
            $this->provider,
            fn (string $reason) => $this->finishReason($reason),
            (string) ($this->provider->mapping['response_envelope'] ?? 'response')
        );
    }
}
