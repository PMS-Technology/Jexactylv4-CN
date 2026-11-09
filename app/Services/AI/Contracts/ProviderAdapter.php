<?php

namespace Everest\Services\AI\Contracts;

use Everest\Services\AI\Data\AIProvider;
use Everest\Services\AI\Data\AIHttpRequest;
use Everest\Services\AI\Data\UnifiedRequest;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Services\AI\Data\AIUpstreamResponse;

interface ProviderAdapter
{
    public function provider(): AIProvider;

    /**
     * Translate the panel request into the upstream HTTP request.
     */
    public function buildRequest(UnifiedRequest $request): AIHttpRequest;

    /**
     * Translate an upstream JSON body into the panel response.
     */
    public function parseResponse(AIUpstreamResponse $response): UnifiedResponse;

    /**
     * A fresh decoder for one streaming call.
     */
    public function createStreamDecoder(): StreamDecoder;

    /**
     * Request used by the configurable model discovery endpoint.
     */
    public function buildModelsRequest(): AIHttpRequest;

    /**
     * Normalize the upstream model list into [['id' => ..., 'name' => ...], ...].
     */
    public function parseModels(AIUpstreamResponse $response): array;
}
