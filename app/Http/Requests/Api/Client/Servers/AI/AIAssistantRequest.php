<?php

namespace Everest\Http\Requests\Api\Client\Servers\AI;

use Everest\Models\Permission;
use Everest\Http\Requests\Api\Client\ClientApiRequest;

/**
 * Base request for the server assistant.
 *
 * On top of the usual server permission check it makes sure the AI module is
 * actually available to this user: the module has to be enabled, and either
 * the administrator opened it up for regular users or the caller is an
 * administrator themselves.
 */
abstract class AIAssistantRequest extends ClientApiRequest
{
    public function permission(): string
    {
        return Permission::ACTION_AI_ASSISTANT;
    }

    public function authorize(): bool
    {
        if (!parent::authorize()) {
            return false;
        }

        return $this->aiAvailable();
    }

    protected function aiAvailable(): bool
    {
        if (!config('modules.ai.enabled')) {
            return false;
        }

        if (config('modules.ai.user_access')) {
            return true;
        }

        $user = $this->user();

        return (bool) ($user->root_admin || $user->admin_role_id);
    }
}
