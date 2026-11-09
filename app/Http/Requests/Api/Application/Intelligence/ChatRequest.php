<?php

namespace Everest\Http\Requests\Api\Application\Intelligence;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class ChatRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            'provider' => 'nullable|string|max:64',
            'model' => 'nullable|string|max:200',
            'system' => 'nullable|string|max:20000',
            'messages' => 'required|array|min:1|max:200',
            'messages.*.role' => 'required|string|in:system,user,assistant,tool',
            'messages.*.content' => 'nullable|string|max:200000',
            'messages.*.images' => 'nullable|array|max:10',
            'messages.*.images.*.url' => 'nullable|string|max:4000',
            'messages.*.images.*.data' => 'nullable|string',
            'messages.*.images.*.media_type' => 'nullable|string|max:100',
            'messages.*.tool_calls' => 'nullable|array|max:50',
            'messages.*.tool_calls.*.id' => 'nullable|string|max:200',
            'messages.*.tool_calls.*.name' => 'nullable|string|max:200',
            'messages.*.tool_calls.*.arguments' => 'nullable',
            'messages.*.tool_call_id' => 'nullable|string|max:200',
            'messages.*.name' => 'nullable|string|max:200',
            'tools' => 'nullable|array|max:50',
            'tools.*.name' => 'required_with:tools|string|max:200',
            'tools.*.description' => 'nullable|string|max:5000',
            'tools.*.parameters' => 'nullable|array',
            'tool_choice' => 'nullable|string|max:200',
            'max_tokens' => 'nullable|integer|min:1|max:200000',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'stream' => 'nullable|bool',
            'options' => 'nullable|array',
        ];
    }

    public function permission(): string
    {
        return AdminRole::AI_READ;
    }
}
