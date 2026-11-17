<?php

namespace Everest\Http\Requests\Api\Client\Servers\AI;

class AssistantStepRequest extends AIAssistantRequest
{
    public function rules(): array
    {
        return [
            'mode' => 'nullable|string|in:chat,diagnose',
            'messages' => 'required|array|min:1|max:60',
            'messages.*.role' => 'required|string|in:system,user,assistant,tool',
            'messages.*.content' => 'nullable|string|max:100000',
            'messages.*.tool_calls' => 'nullable|array|max:50',
            'messages.*.tool_calls.*.id' => 'nullable|string|max:200',
            'messages.*.tool_calls.*.name' => 'nullable|string|max:200',
            'messages.*.tool_calls.*.arguments' => 'nullable|array',
            'messages.*.tool_call_id' => 'nullable|string|max:200',
            'bypass' => 'nullable|boolean',
            'stream' => 'nullable|boolean',
            'console_log' => 'nullable|array|max:2000',
            'console_log.*' => 'nullable|string|max:4000',
        ];
    }

    public function mode(): string
    {
        return $this->input('mode') === 'diagnose' ? 'diagnose' : 'chat';
    }

    /**
     * The conversation as the model should see it.
     *
     * Not named `messages()`, because that is the hook Laravel uses for the
     * validation error messages.
     *
     * @return array<int, array<string, mixed>>
     */
    public function conversation(): array
    {
        return array_map(fn ($message) => (array) $message, (array) $this->input('messages', []));
    }

    public function consoleLog(): array
    {
        return array_values(array_filter(
            array_map(fn ($line) => (string) $line, (array) $this->input('console_log', [])),
            fn (string $line) => $line !== ''
        ));
    }

    public function bypass(): bool
    {
        return $this->boolean('bypass');
    }

    public function streams(): bool
    {
        return $this->boolean('stream');
    }
}
