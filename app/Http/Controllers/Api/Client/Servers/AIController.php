<?php

namespace Everest\Http\Controllers\Api\Client\Servers;

use Everest\Models\Server;
use Illuminate\Http\JsonResponse;
use Everest\Services\AI\AIProviderService;
use Everest\Http\Controllers\Api\Client\ClientApiController;
use Everest\Http\Requests\Api\Client\Servers\QueryAIRequest;

class AIController extends ClientApiController
{
    /**
     * AIController constructor.
     */
    public function __construct(private AIProviderService $provider)
    {
        parent::__construct();
    }

    /**
     * Send an AI generated response to debug a server error.
     */
    public function index(QueryAIRequest $request, Server $server): JsonResponse
    {
        if (!config('modules.ai.enabled')) {
            throw new \Exception('The Jexactyl AI module is not enabled.');
        }

        return response()->json($this->provider->query($request->input('query')));
    }
}
