<?php

namespace Everest\Http\Controllers\Api\Application;

use Everest\Models\Setting;
use Everest\Facades\Activity;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Everest\Services\AI\AIProviderService;
use Everest\Http\Requests\Api\Application\Intelligence;

class IntelligenceController extends ApplicationApiController
{
    /**
     * IntelligenceController constructor.
     */
    public function __construct(private AIProviderService $provider)
    {
        parent::__construct();
    }

    /**
     * Update the AI settings for the Panel.
     *
     * @throws \Throwable
     */
    public function update(Intelligence\UpdateIntelligenceSettingsRequest $request): Response
    {
        foreach ($request->validated() as $key => $value) {
            Setting::set('settings::modules:ai:' . $key, $value);
        }

        Activity::event('admin:ai:update')
            ->property('settings', $request->safe()->except('key'))
            ->description('Jexactyl AI settings were updated')
            ->log();

        return $this->returnNoContent();
    }

    /**
     * Send a query through the configured AI provider.
     *
     * @throws \Throwable
     */
    public function query(Intelligence\QueryRequest $request): JsonResponse
    {
        if (!config('modules.ai.enabled')) {
            throw new \Exception('The Jexactyl AI module is not enabled.');
        }

        return response()->json($this->provider->query($request->input('query')));
    }

    public function syncModels(Intelligence\SyncModelsRequest $request): JsonResponse
    {
        $models = $this->provider->models();
        Setting::set('settings::modules:ai:models', json_encode($models));
        $routes = json_decode((string) config('modules.ai.model_routes', '[]'), true) ?: [];
        $routes[(string) config('modules.ai.format')] = $this->provider->modelRoutes();
        Setting::set('settings::modules:ai:model_routes', json_encode($routes));

        return response()->json($models);
    }
}
