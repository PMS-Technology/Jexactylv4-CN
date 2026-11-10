<?php

namespace Everest\Http\Requests\Api\Application\Settings;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdateApplicationSettingsRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            'app:name' => 'nullable|string|min:3|max:40',
            'app:logo' => 'nullable|url|max:255',
            'app:auto_update' => 'nullable|bool',
            'app:indicators' => 'nullable|bool',
            'app:speed_dial' => 'nullable|bool',

            'activity:enabled:account' => 'nullable|bool',
            'activity:enabled:server' => 'nullable|bool',
            'activity:enabled:admin' => 'nullable|bool',

            'captcha:enabled' => 'nullable|bool',
            'captcha:provider' => 'nullable|in:recaptcha,hcaptcha,turnstile,geetest,corptcha',
            'captcha:recaptcha:site_key' => 'nullable|string|max:255',
            'captcha:recaptcha:secret_key' => 'nullable|string|max:255',
            'captcha:hcaptcha:site_key' => 'nullable|string|max:255',
            'captcha:hcaptcha:secret_key' => 'nullable|string|max:255',
            'captcha:turnstile:site_key' => 'nullable|string|max:255',
            'captcha:turnstile:secret_key' => 'nullable|string|max:255',
            'captcha:geetest:site_key' => 'nullable|string|max:255',
            'captcha:geetest:secret_key' => 'nullable|string|max:255',
            'captcha:corptcha:site_key' => 'nullable|string|max:255',
            'captcha:corptcha:secret_key' => 'nullable|string|max:255',
            'captcha:corptcha:api_base' => 'nullable|url|max:255',
        ];
    }

    public function permission(): string
    {
        return AdminRole::SETTINGS_UPDATE;
    }
}
