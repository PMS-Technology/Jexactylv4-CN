<?php

namespace Everest\Http\Requests\Api\Application\Intelligence;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class MetadataRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            'provider' => 'nullable|string|max:64',
            'refresh' => 'nullable|bool',
        ];
    }

    public function permission(): string
    {
        return AdminRole::AI_READ;
    }
}
