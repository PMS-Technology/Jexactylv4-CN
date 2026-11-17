<?php

namespace Everest\Tests\Unit\Services\AI;

use Everest\Models\Permission;
use Illuminate\Contracts\Foundation\Application;
use Everest\Services\AI\Server\ServerAIToolRegistry;
use Everest\Services\AI\Server\Contracts\ServerAITool;
use Everest\Services\AI\Server\Tools\AbstractServerAITool;

/**
 * The catalogue of server tools.
 *
 * These checks guard the contract the model relies on: every tool is
 * addressable by a unique name, describes itself well enough to be called, and
 * asks for a permission the panel actually knows about.
 */
class ServerToolRegistryTest extends \PHPUnit\Framework\TestCase
{
    /**
     * A registry whose tools are built without their constructor, so the test
     * does not need the container.
     */
    protected function registry(): ServerAIToolRegistry
    {
        $app = $this->createMock(Application::class);
        $app->method('make')->willReturnCallback(function (string $class) {
            return (new \ReflectionClass($class))->newInstanceWithoutConstructor();
        });

        return new ServerAIToolRegistry($app);
    }

    public function testEveryToolHasAUniqueName(): void
    {
        $names = array_map(fn (ServerAITool $tool) => $tool->name(), $this->registry()->all());

        $this->assertNotEmpty($names);
        $this->assertSame(count($names), count(array_unique($names)));
    }

    public function testEveryToolDescribesItself(): void
    {
        foreach ($this->registry()->all() as $tool) {
            $this->assertNotSame('', $tool->description(), $tool->name() . ' has no description');
            $this->assertIsArray($tool->parameters(), $tool->name() . ' has no parameter schema');
            $this->assertArrayHasKey('type', $tool->parameters(), $tool->name() . ' has no schema type');
            $this->assertArrayHasKey('properties', $tool->parameters(), $tool->name() . ' has no schema properties');
        }
    }

    public function testTheReadOnlyToolsAreTheOnesThatOnlyRead(): void
    {
        $readOnly = array_map(
            fn (ServerAITool $tool) => $tool->name(),
            array_filter($this->registry()->all(), fn (ServerAITool $tool) => !$tool->mutates())
        );

        sort($readOnly);

        $this->assertSame([
            'activity_log',
            'console_output',
            'list_backups',
            'list_databases',
            'list_files',
            'list_schedules',
            'read_file',
            'server_info',
            'server_variables',
        ], $readOnly);
    }

    public function testTheMutatingToolsAreTheOnesThatChangeTheServer(): void
    {
        $mutating = array_map(
            fn (ServerAITool $tool) => $tool->name(),
            array_filter($this->registry()->all(), fn (ServerAITool $tool) => $tool->mutates())
        );

        sort($mutating);

        $this->assertSame([
            'create_backup',
            'create_database',
            'create_directory',
            'delete_database',
            'delete_file',
            'power_action',
            'pull_file',
            'rename_file',
            'rename_server',
            'restore_backup',
            'rotate_database_password',
            'run_command',
            'set_docker_image',
            'set_variable',
            'write_file',
        ], $mutating);
    }

    public function testEveryToolAsksForAKnownPermission(): void
    {
        // The catalogue is grouped by prefix, so flatten it into "prefix.key".
        $known = [];
        foreach (Permission::permissions() as $prefix => $group) {
            foreach (array_keys($group['keys']) as $key) {
                $known[] = $prefix . '.' . $key;
            }
        }

        foreach ($this->registry()->all() as $tool) {
            foreach ($tool->permissions() as $permission) {
                $this->assertContains(
                    $permission,
                    $known,
                    sprintf('%s asks for the unknown permission "%s"', $tool->name(), $permission)
                );
            }
        }
    }

    public function testThePowerActionAsksForThePermissionOfItsAction(): void
    {
        $tool = $this->registry()->find('power_action');

        $this->assertNotNull($tool);
        $this->assertSame([Permission::ACTION_CONTROL_START], $tool->permissions(['action' => 'start']));
        $this->assertSame([Permission::ACTION_CONTROL_STOP], $tool->permissions(['action' => 'stop']));
        $this->assertSame([Permission::ACTION_CONTROL_STOP], $tool->permissions(['action' => 'kill']));
        $this->assertSame([Permission::ACTION_CONTROL_RESTART], $tool->permissions(['action' => 'restart']));
    }

    public function testPathsAreKeptInsideTheServer(): void
    {
        $tool = new class () extends AbstractServerAITool {
            public function name(): string
            {
                return 'test';
            }

            public function description(): string
            {
                return 'test';
            }

            public function parameters(): array
            {
                return [];
            }

            public function mutates(): bool
            {
                return false;
            }

            public function permissions(array $arguments = []): array
            {
                return [];
            }

            public function summary(array $arguments): string
            {
                return '';
            }

            public function handle(
                \Everest\Models\Server $server,
                \Everest\Models\User $user,
                array $arguments,
                array $context = [],
            ): \Everest\Services\AI\Server\Data\ToolResult {
                return \Everest\Services\AI\Server\Data\ToolResult::ok('');
            }

            public function normalise(?string $path): string
            {
                return $this->path($path);
            }
        };

        $this->assertSame('/server.properties', $tool->normalise('server.properties'));
        $this->assertSame('/plugins/config.yml', $tool->normalise('/plugins//config.yml'));
        $this->assertSame('/etc/passwd', $tool->normalise('/../../etc/passwd'));
        $this->assertSame('/', $tool->normalise(''));
    }
}
