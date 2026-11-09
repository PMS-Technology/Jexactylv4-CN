<?php

/*
|--------------------------------------------------------------------------
| AI module defaults
|--------------------------------------------------------------------------
|
| The provider definitions themselves live in config/ai/providers.php. Adding
| another wire format only requires a new entry there (and, at most, one new
| driver class registered in AIProviderRegistry).
|
*/

return [
    /*
     * Provider used when a request does not explicitly choose one. The legacy
     * Gemini-only configuration keeps working because this defaults to AI Studio
     * and modules.ai.key is applied as that provider's credential.
     */
    'default_provider' => env('AI_PROVIDER', 'google_ai_studio'),

    'timeout' => (int) env('AI_TIMEOUT', 120),
    'connect_timeout' => (int) env('AI_CONNECT_TIMEOUT', 10),

    /*
     * How long discovered model lists are cached, in seconds.
     */
    'models_cache_ttl' => (int) env('AI_MODELS_CACHE_TTL', 3600),
];
