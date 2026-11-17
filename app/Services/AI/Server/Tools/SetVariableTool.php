<?php

namespace Everest\Services\AI\Server\Tools;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Facades\Activity;
use Everest\Models\Permission;
use Illuminate\Support\Facades\Validator;
use Everest\Services\AI\Server\Data\ToolResult;
use Everest\Repositories\Eloquent\ServerVariableRepository;

/**
 * Changes one of the startup parameters.
 */
class SetVariableTool extends AbstractServerAITool
{
    public function __construct(
        private readonly ServerVariableRepository $repository,
    ) {
    }

    public function name(): string
    {
        return 'set_variable';
    }

    public function description(): string
    {
        return 'Change one startup parameter (environment variable) of the server, for example the '
            . 'server port, the world name or a mod\'s configuration value. Read server_variables first '
            . 'to learn the exact key and whether it is editable. The change applies the next time the '
            . 'server starts.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'key' => [
                    'type' => 'string',
                    'description' => 'The environment variable name, e.g. "SERVER_PORT" or "MAX_PLAYERS".',
                ],
                'value' => [
                    'type' => 'string',
                    'description' => 'The new value. An empty string is a valid value for some variables.',
                ],
            ],
            'required' => ['key', 'value'],
        ];
    }

    public function mutates(): bool
    {
        return true;
    }

    public function permissions(array $arguments = []): array
    {
        return [Permission::ACTION_STARTUP_UPDATE];
    }

    public function summary(array $arguments): string
    {
        return sprintf(
            '修改启动参数 %s = %s',
            (string) $this->string($arguments, 'key'),
            (string) ($arguments['value'] ?? '')
        );
    }

    public function handle(Server $server, User $user, array $arguments, array $context = []): ToolResult
    {
        $key = $this->string($arguments, 'key');
        $value = (string) ($arguments['value'] ?? '');

        if ($key === null) {
            return ToolResult::fail('No variable key was given.');
        }

        $variable = $server->variables()->where('env_variable', $key)->first();

        if (!$variable || !$variable->user_viewable) {
            return ToolResult::fail(sprintf('There is no startup parameter named "%s".', $key));
        }

        if (!$variable->user_editable) {
            return ToolResult::fail(sprintf('The startup parameter "%s" is read-only.', $key));
        }

        $validator = Validator::make(['value' => $value], ['value' => $variable->rules]);

        if ($validator->fails()) {
            return ToolResult::fail(sprintf(
                'The value for "%s" is not valid: %s',
                $key,
                $validator->errors()->first()
            ));
        }

        $original = $variable->server_value;

        $this->repository->updateOrCreate([
            'server_id' => $server->id,
            'variable_id' => $variable->id,
        ], [
            'variable_value' => $value,
        ]);

        Activity::event('server:startup.edit')
            ->subject($variable)
            ->property([
                'variable' => $variable->env_variable,
                'old' => $original,
                'new' => $value,
            ])
            ->property('source', 'ai')
            ->log();

        return ToolResult::ok(sprintf(
            'Set %s to "%s". The new value is used the next time the server starts.',
            $key,
            $value
        ));
    }
}
