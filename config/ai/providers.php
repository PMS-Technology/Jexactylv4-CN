<?php

/*
|--------------------------------------------------------------------------
| AI provider registry
|--------------------------------------------------------------------------
|
| Every upstream format is a self-contained entry. `driver` selects a protocol
| adapter, while base URL, authentication, headers, endpoint paths, model
| discovery and response field mapping are data. A provider that routes each
| model to a different endpoint declares `routes`; the registry resolves the
| first matching rule at runtime using `*` wildcards.
|
| Adding a format: copy an entry, set `driver` and paths. No calling code changes.
|
*/

$openAiModels = ['enabled' => true, 'path' => 'models', 'format' => 'openai', 'fallback' => ['gpt-4o-mini', 'gpt-4o']];

return [
    'anthropic' => [
        'label' => 'Anthropic',
        'driver' => 'anthropic_messages',
        'base_url' => env('AI_ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
        'auth' => [
            'type' => 'header',
            'header' => 'x-api-key',
            'token' => env('AI_ANTHROPIC_KEY', ''),
        ],
        'headers' => [
            'anthropic-version' => env('AI_ANTHROPIC_VERSION', '2023-06-01'),
        ],
        'paths' => [
            'messages' => '/v1/messages',
            'models' => '/v1/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'anthropic',
            'fallback' => ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
        ],
        'default_model' => env('AI_ANTHROPIC_MODEL', 'claude-sonnet-4-5'),
    ],

    'claude_code' => [
        'label' => 'Anthropic Claude Code',
        'driver' => 'anthropic_messages',
        'base_url' => env('AI_CLAUDE_CODE_BASE_URL', 'https://api.anthropic.com'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_CLAUDE_CODE_TOKEN', ''),
        ],
        'headers' => [
            'anthropic-version' => env('AI_CLAUDE_CODE_ANTHROPIC_VERSION', '2023-06-01'),
            'anthropic-beta' => env('AI_CLAUDE_CODE_BETA', 'claude-code-20250219,oauth-2025-04-20'),
            'x-app' => 'cli',
            'User-Agent' => 'claude-cli/2.0.0 (external, cli)',
        ],
        'paths' => [
            'messages' => '/v1/messages',
            'models' => '/v1/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'anthropic',
            'fallback' => ['claude-sonnet-4-5', 'claude-opus-4-1'],
        ],
        'default_model' => env('AI_CLAUDE_CODE_MODEL', 'claude-sonnet-4-5'),
    ],

    'command_code' => [
        'label' => 'Command Code',
        'driver' => 'openai_chat',
        'base_url' => env('AI_COMMAND_CODE_BASE_URL', 'https://api.commandcode.ai'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_COMMAND_CODE_KEY', ''),
        ],
        'paths' => [
            'chat' => '/v1/chat/completions',
            'models' => '/v1/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'openai',
            'fallback' => ['command-code'],
        ],
        'mapping' => [
            'max_tokens_key' => 'max_tokens',
        ],
        'default_model' => env('AI_COMMAND_CODE_MODEL', 'command-code'),
        'options' => [
            'requires_key' => true,
            'auto_sync_models' => true,
            'note' => 'Official API; model list is discovered at runtime.',
        ],
    ],

    'opencode_zen' => [
        'label' => 'OpenCode Zen',
        'driver' => 'openai_chat',
        'base_url' => env('AI_OPENCODE_ZEN_BASE_URL', 'https://opencode.ai/zen/v1'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_OPENCODE_ZEN_KEY', ''),
        ],
        'paths' => [
            'chat' => '/chat/completions',
            'messages' => '/messages',
            'responses' => '/responses',
            'models' => '/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'openai',
            'fallback' => ['claude-sonnet-4-5', 'gpt-5', 'gemini-2.5-pro'],
        ],
        'routes' => [
            ['match' => 'claude-*', 'driver' => 'anthropic_messages', 'headers' => ['anthropic-version' => '2023-06-01']],
            ['match' => 'gpt-5*', 'driver' => 'openai_responses'],
            ['match' => 'gpt-5-*', 'driver' => 'openai_responses'],
            ['match' => 'o3*', 'driver' => 'openai_responses'],
            ['match' => 'o4*', 'driver' => 'openai_responses'],
            ['match' => '*', 'driver' => 'openai_chat'],
        ],
        'default_model' => env('AI_OPENCODE_ZEN_MODEL', 'claude-sonnet-4-5'),
        'options' => [
            'requires_key' => true,
            'auto_sync_models' => true,
        ],
    ],

    'opencode_go' => [
        'label' => 'OpenCode Go',
        'driver' => 'openai_chat',
        'base_url' => env('AI_OPENCODE_GO_BASE_URL', 'https://opencode.ai/go/v1'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_OPENCODE_GO_KEY', ''),
        ],
        'paths' => [
            'chat' => '/chat/completions',
            'messages' => '/messages',
            'responses' => '/responses',
            'models' => '/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'openai',
            'fallback' => ['claude-sonnet-4-5', 'gpt-5', 'gemini-2.5-pro'],
        ],
        'routes' => [
            ['match' => 'claude-*', 'driver' => 'anthropic_messages', 'headers' => ['anthropic-version' => '2023-06-01']],
            ['match' => 'gpt-5*', 'driver' => 'openai_responses'],
            ['match' => 'gpt-5-*', 'driver' => 'openai_responses'],
            ['match' => 'o3*', 'driver' => 'openai_responses'],
            ['match' => 'o4*', 'driver' => 'openai_responses'],
            ['match' => '*', 'driver' => 'openai_chat'],
        ],
        'default_model' => env('AI_OPENCODE_GO_MODEL', 'claude-sonnet-4-5'),
        'options' => [
            'requires_key' => true,
            'auto_sync_models' => true,
        ],
    ],

    'openrouter' => [
        'label' => 'OpenRouter',
        'driver' => 'openai_chat',
        'base_url' => env('AI_OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_OPENROUTER_KEY', ''),
        ],
        'headers' => [
            'HTTP-Referer' => env('AI_OPENROUTER_SITE_URL', env('APP_URL', '')),
            'X-Title' => env('AI_OPENROUTER_SITE_NAME', 'Jexpanel'),
        ],
        'paths' => [
            'chat' => '/chat/completions',
            'models' => '/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'openai',
            'fallback' => ['anthropic/claude-sonnet-4.5', 'openai/gpt-5', 'google/gemini-2.5-pro'],
        ],
        'default_model' => env('AI_OPENROUTER_MODEL', 'anthropic/claude-sonnet-4.5'),
    ],

    'google_ai_studio' => [
        'label' => 'Google AI Studio (Gemini API)',
        'driver' => 'gemini_generate_content',
        'base_url' => env('AI_GOOGLE_BASE_URL', 'https://generativelanguage.googleapis.com'),
        'auth' => [
            'type' => 'query',
            'param' => 'key',
            'token' => env('AI_GOOGLE_KEY', env('AI_KEY', '')),
        ],
        'paths' => [
            'generate' => '/v1beta/models/{model}:generateContent',
            'stream' => '/v1beta/models/{model}:streamGenerateContent?alt=sse',
            'models' => '/v1beta/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'gemini',
            'fallback' => ['gemini-2.5-flash', 'gemini-2.5-pro'],
        ],
        'default_model' => env('AI_GOOGLE_MODEL', 'gemini-2.5-flash'),
    ],

    'google_vertex' => [
        'label' => 'Google Vertex AI',
        'driver' => 'gemini_generate_content',
        'base_url' => env('AI_VERTEX_BASE_URL', 'https://{location}-aiplatform.googleapis.com'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_VERTEX_TOKEN', ''),
        ],
        'paths' => [
            'generate' => '/v1beta1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent',
            'stream' => '/v1beta1/projects/{project}/locations/{location}/publishers/google/models/{model}:streamGenerateContent?alt=sse',
            'models' => '/v1beta1/projects/{project}/locations/{location}/publishers/google/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'gemini',
            'items' => 'models',
            'fallback' => ['gemini-2.5-flash', 'gemini-2.5-pro'],
        ],
        'default_model' => env('AI_VERTEX_MODEL', 'gemini-2.5-flash'),
        'options' => [
            'project' => env('AI_VERTEX_PROJECT', ''),
            'location' => env('AI_VERTEX_LOCATION', 'us-central1'),
            'requires_key' => true,
        ],
    ],

    'openai' => [
        'label' => 'OpenAI Chat Completions',
        'driver' => 'openai_chat',
        'base_url' => env('AI_OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_OPENAI_KEY', ''),
        ],
        'paths' => [
            'chat' => '/chat/completions',
            'models' => '/models',
        ],
        'models' => $openAiModels,
        'mapping' => [
            'max_tokens_key' => 'max_completion_tokens',
        ],
        'default_model' => env('AI_OPENAI_MODEL', 'gpt-4o-mini'),
    ],

    'openai_responses' => [
        'label' => 'OpenAI Responses API',
        'driver' => 'openai_responses',
        'base_url' => env('AI_OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_OPENAI_KEY', ''),
        ],
        'paths' => [
            'responses' => '/responses',
            'models' => '/models',
        ],
        'models' => $openAiModels,
        'mapping' => [
            'max_tokens_key' => 'max_output_tokens',
        ],
        'default_model' => env('AI_OPENAI_RESPONSES_MODEL', 'gpt-5'),
    ],

    'ollama' => [
        'label' => 'Ollama',
        'driver' => 'ollama_chat',
        'base_url' => env('AI_OLLAMA_BASE_URL', 'http://localhost:11434'),
        'auth' => [
            'type' => 'none',
        ],
        'paths' => [
            'chat' => '/api/chat',
            'models' => '/api/tags',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'ollama',
            'fallback' => ['llama3.2', 'qwen2.5-coder'],
        ],
        'default_model' => env('AI_OLLAMA_MODEL', 'llama3.2'),
        'options' => [
            'requires_key' => false,
        ],
    ],

    'zed' => [
        'label' => 'Zed',
        'driver' => 'openai_completions',
        'base_url' => env('AI_ZED_BASE_URL', 'https://api.zed.dev/v1'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_ZED_KEY', ''),
        ],
        'paths' => [
            'completions' => '/completions',
            'models' => '/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'openai',
            'fallback' => ['claude-sonnet-4', 'gpt-4o'],
        ],
        'mapping' => [
            'prompt_format' => 'plain',
        ],
        'default_model' => env('AI_ZED_MODEL', 'claude-sonnet-4'),
    ],

    'google_antigravity' => [
        'label' => 'Google Antigravity',
        'driver' => 'gemini_internal',
        'base_url' => env('AI_ANTIGRAVITY_BASE_URL', 'https://cloudcode-pa.googleapis.com'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_ANTIGRAVITY_TOKEN', ''),
        ],
        'paths' => [
            'internal' => '/v1internal:generateContent',
            'stream' => '/v1internal:streamGenerateContent?alt=sse',
        ],
        'models' => [
            'enabled' => false,
            'format' => 'gemini',
            'fallback' => ['gemini-2.5-pro', 'gemini-2.5-flash'],
        ],
        'mapping' => [
            'response_envelope' => 'response',
        ],
        'default_model' => env('AI_ANTIGRAVITY_MODEL', 'gemini-2.5-pro'),
        'options' => [
            'requires_key' => true,
        ],
    ],

    'gemini_cli' => [
        'label' => 'Google Gemini CLI',
        'driver' => 'gemini_internal',
        'base_url' => env('AI_GEMINI_CLI_BASE_URL', 'https://cloudcode-pa.googleapis.com'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_GEMINI_CLI_TOKEN', ''),
        ],
        'paths' => [
            'internal' => '/v1internal:generateContent',
            'stream' => '/v1internal:streamGenerateContent?alt=sse',
        ],
        'models' => [
            'enabled' => false,
            'format' => 'gemini',
            'fallback' => ['gemini-2.5-pro', 'gemini-2.5-flash'],
        ],
        'mapping' => [
            'response_envelope' => 'response',
        ],
        'default_model' => env('AI_GEMINI_CLI_MODEL', 'gemini-2.5-pro'),
        'options' => [
            'project' => env('AI_GEMINI_CLI_PROJECT', ''),
            'requires_key' => true,
        ],
    ],

    'github_copilot' => [
        'label' => 'GitHub Copilot',
        'driver' => 'openai_chat',
        'base_url' => env('AI_COPILOT_BASE_URL', 'https://api.githubcopilot.com'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_COPILOT_TOKEN', ''),
        ],
        'headers' => [
            'Copilot-Integration-Id' => env('AI_COPILOT_INTEGRATION_ID', 'vscode-chat'),
            'Editor-Version' => env('AI_COPILOT_EDITOR_VERSION', 'vscode/1.99.0'),
        ],
        'paths' => [
            'chat' => '/chat/completions',
            'responses' => '/responses',
            'models' => '/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'openai',
            'fallback' => ['gpt-4o', 'claude-sonnet-4', 'gpt-5'],
        ],
        'routes' => [
            ['match' => 'gpt-5*', 'driver' => 'openai_responses'],
            ['match' => '*codex*', 'driver' => 'openai_responses'],
            ['match' => '*', 'driver' => 'openai_chat'],
        ],
        'default_model' => env('AI_COPILOT_MODEL', 'gpt-4o'),
    ],

    'openai_codex' => [
        'label' => 'OpenAI Codex',
        'driver' => 'openai_responses',
        'base_url' => env('AI_CODEX_BASE_URL', 'https://chatgpt.com'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_CODEX_TOKEN', ''),
        ],
        'headers' => [
            'OpenAI-Beta' => 'responses=experimental',
            'originator' => 'codex_cli_rs',
            'User-Agent' => 'codex_cli_rs/0.50.0',
        ],
        'paths' => [
            'responses' => '/backend-api/codex/responses',
        ],
        'models' => [
            'enabled' => false,
            'format' => 'openai',
            'fallback' => ['gpt-5-codex', 'gpt-5', 'o4-mini'],
        ],
        'mapping' => [
            'max_tokens_key' => 'max_output_tokens',
            'system_as_input' => true,
        ],
        'options' => [
            'store' => false,
            'requires_key' => true,
        ],
        'default_model' => env('AI_CODEX_MODEL', 'gpt-5-codex'),
    ],

    'xai_grok' => [
        'label' => 'xAI Grok Build',
        'driver' => 'openai_responses',
        'base_url' => env('AI_XAI_BASE_URL', 'https://api.x.ai/v1'),
        'auth' => [
            'type' => 'bearer',
            'token' => env('AI_XAI_KEY', ''),
        ],
        'paths' => [
            'responses' => '/responses',
            'models' => '/models',
        ],
        'models' => [
            'enabled' => true,
            'path' => 'models',
            'format' => 'openai',
            'fallback' => ['grok-4', 'grok-code-fast-1'],
        ],
        'default_model' => env('AI_XAI_MODEL', 'grok-4'),
    ],
];
