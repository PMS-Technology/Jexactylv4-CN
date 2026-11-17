<?php

namespace Everest\Http\Requests\Api\Application\Settings;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class SendTestEmailRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            'email' => 'required|email|max:191',
        ];
    }

    public function permission(): string
    {
        return AdminRole::SETTINGS_UPDATE;
    }
}
