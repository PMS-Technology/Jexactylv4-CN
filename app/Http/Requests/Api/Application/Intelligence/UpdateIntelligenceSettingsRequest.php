<?php

namespace Everest\Http\Requests\Api\Application\Intelligence;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdateIntelligenceSettingsRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            'enabled' => 'nullable|bool',
            'key' => 'nullable',
            'user_access' => 'nullable|bool',
            'provider' => 'nullable|string|max:64',
            'model' => 'nullable|string|max:200',
            'base_url' => 'nullable|string|max:500',
            'headers' => 'nullable',
            'max_tokens' => 'nullable|integer|min:1|max:200000',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'system_prompt' => 'nullable|string|max:20000',
        ];
    }

    public function permission(): string
    {
        return AdminRole::AI_UPDATE;
    }
}
