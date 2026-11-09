<?php

namespace Everest\Services\AI\Http;

use Illuminate\Support\Facades\Http;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Data\AIStreamChunk;
use Everest\Services\AI\Data\AIUpstreamResponse;
use Everest\Services\AI\Exceptions\AIProviderException;

/**
 * Thin transport around Laravel's HTTP client. It does not interpret provider
 * payloads; it only preserves status codes, headers and raw bodies.
 */
class AIHttpClient
{
    public function send(AIHttpRequest $request): AIUpstreamResponse
    {
        $response = $this->dispatch($request, false);
        $body = $response->body();

        if ($response->failed()) {
            throw new AIProviderException(status: $response->status(), body: $body, contentType: $response->header('Content-Type') ?: 'application/json', provider: $request->providerId, url: $request->url);
        }

        return new AIUpstreamResponse($response->status(), $response->headers(), $body);
    }

    /**
     * @return \Generator<AIStreamChunk>
     */
    public function stream(AIHttpRequest $request): \Generator
    {
        $response = $this->dispatch($request, true);

        if ($response->failed()) {
            throw new AIProviderException(status: $response->status(), body: $response->body(), contentType: $response->header('Content-Type') ?: 'application/json', provider: $request->providerId, url: $request->url);
        }

        $stream = $response->toPsrResponse()->getBody();
        $buffer = '';

        if ($request->streamFormat === 'ndjson') {
            while (!$stream->eof()) {
                $chunk = $stream->read(8192);
                if ($chunk === '') {
                    continue;
                }
                $buffer .= $chunk;

                while (($position = strpos($buffer, "\n")) !== false) {
                    $line = trim(substr($buffer, 0, $position));
                    $buffer = substr($buffer, $position + 1);
                    if ($line !== '') {
                        yield new AIStreamChunk(null, $line);
                    }
                }
            }

            if (trim($buffer) !== '') {
                yield new AIStreamChunk(null, trim($buffer));
            }

            return;
        }

        $event = null;
        $dataLines = [];

        while (!$stream->eof()) {
            $chunk = $stream->read(8192);
            if ($chunk === '') {
                continue;
            }
            $buffer .= $chunk;

            while (($position = strpos($buffer, "\n")) !== false) {
                $line = rtrim(substr($buffer, 0, $position), "\r");
                $buffer = substr($buffer, $position + 1);

                if ($line === '') {
                    if ($dataLines !== []) {
                        yield new AIStreamChunk($event, implode("\n", $dataLines));
                    }
                    $event = null;
                    $dataLines = [];
                    continue;
                }

                if (str_starts_with($line, ':')) {
                    continue;
                }

                if (str_starts_with($line, 'event:')) {
                    $event = trim(substr($line, 6));
                    continue;
                }

                if (str_starts_with($line, 'data:')) {
                    $dataLines[] = ltrim(substr($line, 5));
                }
            }
        }

        if ($dataLines !== []) {
            yield new AIStreamChunk($event, implode("\n", $dataLines));
        }
    }

    protected function dispatch(AIHttpRequest $request, bool $stream)
    {
        $headers = $request->headers;
        if ($stream) {
            $headers['Accept'] = 'text/event-stream';
        }

        $pending = Http::withHeaders($headers)
            ->timeout((int) config('ai.timeout', 120))
            ->connectTimeout((int) config('ai.connect_timeout', 10));

        if ($stream) {
            $pending = $pending->withOptions(['stream' => true]);
        }

        $options = $request->body === [] ? [] : ['json' => $request->body];

        return $pending->send($request->method, $request->url, $options);
    }
}
