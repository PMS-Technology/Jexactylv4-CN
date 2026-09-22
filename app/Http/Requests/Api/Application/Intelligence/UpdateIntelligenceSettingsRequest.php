<?php

namespace Everest\Http\Requests\Api\Application\Intelligence;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdateIntelligenceSettingsRequest extends ApplicationApiRequest
{
    private const FORMATS = [
        'anthropic_messages',
        'command_code',
        'opencode_zen',
        'opencode_go',
        'openrouter',
        'google_ai_studio',
        'google_vertex_ai',
        'openai_chat',
        'openai_responses',
        'ollama_chat',
        'zed',
        'anthropic_claude_code',
        'google_antigravity',
        'google_gemini_cli',
        'github_copilot',
        'openai_codex',
        'xai_grok_build',
    ];

    public function rules(): array
    {
        return [
            'enabled' => 'nullable|bool',
            'key' => 'nullable|string|max:4096',
            'user_access' => 'nullable|bool',
            'format' => 'nullable|string|in:' . implode(',', self::FORMATS),
            'model' => 'sometimes|required|string|max:191',
            'base_url' => 'nullable|url|max:2048',
            'project' => 'nullable|string|max:191',
            'location' => 'nullable|string|max:100',
        ];
    }

    public function permission(): string
    {
        return AdminRole::AI_UPDATE;
    }
}
