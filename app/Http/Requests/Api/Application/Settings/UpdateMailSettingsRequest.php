<?php

namespace Everest\Http\Requests\Api\Application\Settings;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdateMailSettingsRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            'enabled' => 'required|bool',
            'driver' => 'required|in:smtp,log,sendmail',
            'host' => 'nullable|string|max:191',
            'port' => 'nullable|integer|min:1|max:65535',
            'encryption' => 'required|in:none,tls,ssl',
            'username' => 'nullable|string|max:191',
            // An empty password keeps the stored one, so the form never has to
            // send the secret back to the browser.
            'password' => 'nullable|string|max:191',
            'from_address' => 'nullable|email|max:191',
            'from_name' => 'nullable|string|max:191',
        ];
    }

    public function permission(): string
    {
        return AdminRole::SETTINGS_UPDATE;
    }
}
