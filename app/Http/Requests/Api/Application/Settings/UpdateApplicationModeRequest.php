<?php

namespace Everest\Http\Requests\Api\Application\Settings;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdateApplicationModeRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            // A missing mode used to be accepted and stored as an empty value, which
            // left the panel without an active mode at all. Only a real mode is
            // accepted now.
            'mode' => 'required|string|in:standard,personal',
        ];
    }

    public function permission(): string
    {
        return AdminRole::SETTINGS_UPDATE;
    }
}
