<?php

namespace Everest\Http\Controllers\Api\Client\Servers;

use Everest\Models\Server;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Everest\Services\AI\AIService;
use Everest\Services\AI\Exceptions\AIProviderException;
use Everest\Http\Controllers\Api\Client\ClientApiController;
use Everest\Http\Requests\Api\Client\Servers\QueryAIRequest;
use Everest\Services\AI\Exceptions\AIConfigurationException;

class AIController extends ClientApiController
{
    public function __construct(
        protected readonly AIService $ai,
    ) {
        parent::__construct();
    }

    /**
     * Send an AI generated response to debug a server error.
     */
    public function index(QueryAIRequest $request, Server $server): JsonResponse|Response
    {
        if (!config('modules.ai.enabled')) {
            return response()->json(['error' => 'The JexpanelAI module is not enabled.'], 400);
        }

        $system = sprintf(
            "%s\n\nThe user is asking about server \"%s\" (UUID %s) on this panel.",
            (string) config('modules.ai.system_prompt'),
            $server->name,
            $server->uuid
        );

        try {
            $response = $this->ai->legacyChat($request->input('query'), $system);
        } catch (AIProviderException $exception) {
            return response($exception->body, $exception->status, [
                'Content-Type' => $exception->contentType,
            ]);
        } catch (AIConfigurationException $exception) {
            return response()->json(['error' => $exception->getMessage()], 400);
        }

        return response()->json($response->text);
    }
}
