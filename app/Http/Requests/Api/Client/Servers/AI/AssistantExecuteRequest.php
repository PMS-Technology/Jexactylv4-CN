<?php

namespace Everest\Http\Requests\Api\Client\Servers\AI;

class AssistantExecuteRequest extends AIAssistantRequest
{
    public function rules(): array
    {
        return [
            'calls' => 'required|array|min:1|max:20',
            'calls.*.id' => 'nullable|string|max:200',
            'calls.*.name' => 'required|string|max:100',
            'calls.*.arguments' => 'nullable|array',
            'console_log' => 'nullable|array|max:2000',
            'console_log.*' => 'nullable|string|max:4000',
        ];
    }

    public function calls(): array
    {
        return array_map(fn ($call) => [
            'id' => (string) ($call['id'] ?? ''),
            'name' => (string) ($call['name'] ?? ''),
            'arguments' => (array) ($call['arguments'] ?? []),
        ], (array) $this->input('calls', []));
    }

    public function consoleLog(): array
    {
        return array_values(array_filter(
            array_map(fn ($line) => (string) $line, (array) $this->input('console_log', [])),
            fn (string $line) => $line !== ''
        ));
    }
}
