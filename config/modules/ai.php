<?php

return [
    /*
     * Enable or disable the AI module.
     */
    'enabled' => env('AI_ENABLED', false),

    /*
     * Set the API key for the selected provider. Kept under the historical
     * `AI_KEY` name so existing Gemini installations keep working unchanged.
     */
    'key' => env('AI_KEY', ''),

    /*
     * Provider id from config/ai/providers.php. Defaults to Google AI Studio,
     * which is what the pre-adapter panel always used.
     */
    'provider' => env('AI_PROVIDER', 'google_ai_studio'),

    /*
     * Optional model override. Empty means the provider's default_model.
     */
    'model' => env('AI_MODEL', ''),

    /*
     * Optional base URL override for self-hosted proxies/gateways.
     */
    'base_url' => env('AI_BASE_URL', ''),

    /*
     * Optional extra headers, either a JSON object or an array.
     */
    'headers' => env('AI_HEADERS', ''),

    'max_tokens' => env('AI_MAX_TOKENS', 1024),
    'temperature' => env('AI_TEMPERATURE', 0.7),

    'system_prompt' => env('AI_SYSTEM_PROMPT', 'You are JexpanelAI, the assistant built into the Jexpanel game server panel. Answer concisely and help users understand server errors and panel features.'),

    /*
     * Should clients/users be allowed
     * to use AI features?
     */
    'user_access' => env('AI_USER_ACCESS', false),
];
