<?php

namespace Everest\Http\Controllers\Api\Application;

use Everest\Models\Setting;
use Everest\Facades\Activity;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Everest\Services\AI\AIService;
use Everest\Services\AI\Data\UnifiedRequest;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Everest\Http\Requests\Api\Application\Intelligence;
use Everest\Services\AI\Exceptions\AIProviderException;
use Everest\Services\AI\Exceptions\AIConfigurationException;

class IntelligenceController extends ApplicationApiController
{
    public function __construct(
        protected readonly AIService $ai,
    ) {
        parent::__construct();
    }

    /**
     * Update the AI settings for the Panel.
     *
     * @throws \Throwable
     */
    public function update(Intelligence\UpdateIntelligenceSettingsRequest $request): Response
    {
        $submitted = $request->all();

        foreach ($request->normalize() as $key => $value) {
            // normalize() includes every rule as null; only persist fields that were
            // actually sent so a toggle cannot wipe model/base_url/system_prompt.
            if (!array_key_exists($key, $submitted)) {
                continue;
            }

            if ($key === 'key' && (is_bool($value) || $value === null || $value === '')) {
                continue;
            }

            if (in_array($key, ['enabled', 'user_access', 'provider', 'max_tokens', 'temperature'], true) && is_null($value)) {
                continue;
            }

            if ($key === 'headers') {
                if ($value === null || $value === '') {
                    continue;
                }
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    if (!is_array($decoded)) {
                        throw ValidationException::withMessages(['headers' => 'The headers field must be a JSON object.']);
                    }
                    $value = $decoded;
                }
                if (!is_array($value)) {
                    throw ValidationException::withMessages(['headers' => 'The headers field must be a JSON object.']);
                }
                $value = json_encode($value);
            }

            Setting::set('settings::modules:ai:' . $key, $value);
        }

        $this->ai->flushModels();

        Activity::event('admin:ai:update')
            ->property('settings', $request->except(['key', 'headers']))
            ->description('JexpanelAI settings were updated')
            ->log();

        return $this->returnNoContent();
    }

    /**
     * Send a query to JexpanelAI. Kept as the legacy text-in/text-out endpoint.
     *
     * @throws \Throwable
     */
    public function query(Intelligence\QueryRequest $request): JsonResponse|Response
    {
        if (!config('modules.ai.enabled')) {
            return response()->json(['error' => 'The JexpanelAI module is not enabled.'], 400);
        }

        try {
            $response = $this->ai->legacyChat($request->input('query'));
        } catch (AIProviderException $exception) {
            return $this->upstreamError($exception);
        } catch (AIConfigurationException $exception) {
            return response()->json(['error' => $exception->getMessage()], 400);
        }

        return response()->json($response->text);
    }

    /**
     * List every registered provider so the admin UI can build its picker.
     */
    public function providers(Intelligence\MetadataRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->ai->catalog()]);
    }

    /**
     * Discover the model list for a provider, using the cache unless refreshed.
     */
    public function models(Intelligence\MetadataRequest $request): JsonResponse|Response
    {
        $validated = $request->validated();

        try {
            $result = $this->ai->models(
                $validated['provider'] ?? null,
                (bool) ($validated['refresh'] ?? false)
            );
        } catch (AIProviderException $exception) {
            return $this->upstreamError($exception);
        } catch (AIConfigurationException $exception) {
            return response()->json(['error' => $exception->getMessage()], 400);
        }

        return response()->json($result);
    }

    /**
     * Unified chat endpoint: messages, images, tools, max tokens/temperature,
     * provider/model selection and optional SSE streaming.
     */
    public function chat(Intelligence\ChatRequest $request): JsonResponse|StreamedResponse|Response
    {
        if (!config('modules.ai.enabled')) {
            return response()->json(['error' => 'The JexpanelAI module is not enabled.'], 400);
        }

        $payload = $request->validated();
        $payload['max_tokens'] ??= (int) config('modules.ai.max_tokens', 1024);
        $payload['temperature'] ??= (float) config('modules.ai.temperature', 0.7);
        $payload['system'] ??= (string) config('modules.ai.system_prompt');

        $unified = UnifiedRequest::fromArray($payload);
        $provider = $request->input('provider');

        if ($request->boolean('stream')) {
            return $this->stream($unified, $provider);
        }

        try {
            $response = $this->ai->chat($unified, $provider);
        } catch (AIProviderException $exception) {
            return $this->upstreamError($exception);
        } catch (AIConfigurationException $exception) {
            return response()->json(['error' => $exception->getMessage()], 400);
        }

        return response()->json($response->toArray());
    }

    protected function stream(UnifiedRequest $request, ?string $provider): StreamedResponse
    {
        return response()->stream(function () use ($request, $provider) {
            try {
                foreach ($this->ai->stream($request, $provider) as $event) {
                    echo 'data: ' . json_encode(
                        $event->toArray(),
                        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                    ) . "\n\n";

                    if (ob_get_level() > 0) {
                        @ob_flush();
                    }
                    flush();
                }
            } catch (AIProviderException $exception) {
                echo 'data: ' . json_encode([
                    'type' => 'error',
                    'status' => $exception->status,
                    'body' => $exception->body,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
            } catch (\Throwable $exception) {
                echo 'data: ' . json_encode([
                    'type' => 'error',
                    'message' => $exception->getMessage(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n\n";
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Preserve the upstream status code and body exactly as received.
     */
    protected function upstreamError(AIProviderException $exception): Response
    {
        return response($exception->body, $exception->status, [
            'Content-Type' => $exception->contentType,
        ]);
    }
}
