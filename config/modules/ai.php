<?php

return [
    /*
     * Enable or disable the AI module.
     */
    'enabled' => env('AI_ENABLED', false),

    /*
     * Credentials and protocol used by the configured AI provider.
     */
    'key' => env('AI_KEY', ''),
    'format' => env('AI_FORMAT', 'google_ai_studio'),
    'model' => env('AI_MODEL', 'gemini-2.0-flash'),
    'base_url' => env('AI_BASE_URL', ''),
    'project' => env('AI_PROJECT', ''),
    'location' => env('AI_LOCATION', 'global'),
    'models' => env('AI_MODELS', '[]'),
    'model_routes' => env('AI_MODEL_ROUTES', '[]'),

    /*
     * Should clients/users be allowed
     * to use AI features?
     */
    'user_access' => env('AI_USER_ACCESS', false),
];
