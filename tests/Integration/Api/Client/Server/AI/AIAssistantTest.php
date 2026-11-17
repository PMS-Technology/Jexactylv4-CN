<?php

namespace Everest\Tests\Integration\Api\Client\Server\AI;

use Everest\Models\User;
use Mockery\MockInterface;
use Everest\Models\Subuser;
use Everest\Models\Permission;
use Everest\Services\AI\AIService;
use Everest\Services\AI\Data\UnifiedResponse;
use Everest\Repositories\Wings\DaemonCommandRepository;
use Everest\Tests\Integration\Api\Client\ClientApiIntegrationTestCase;

/**
 * The server assistant: who may use it, and how a turn of the tool loop is
 * split into the calls that run right away and the ones that wait for the
 * user's approval.
 */
class AIAssistantTest extends ClientApiIntegrationTestCase
{
    public function setUp(): void
    {
        parent::setUp();

        config()->set('modules.ai.enabled', true);
        config()->set('modules.ai.user_access', true);
    }

    /**
     * A canned model answer, so the test never talks to an upstream.
     */
    protected function mockModel(UnifiedResponse $response): void
    {
        $this->mock(AIService::class, function (MockInterface $mock) use ($response) {
            $mock->shouldReceive('chat')->andReturn($response);
        });
    }

    protected function stepLink(\Everest\Models\Server $server, string $append = ''): string
    {
        return '/api/client/servers/' . $server->uuid . '/ai/assistant' . $append;
    }

    public function testTheAssistantIsRefusedWhenTheModuleIsDisabled(): void
    {
        config()->set('modules.ai.enabled', false);

        [$user, $server] = $this->generateTestAccount();

        $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/step'), ['messages' => [['role' => 'user', 'content' => 'hi']]])
            ->assertForbidden();
    }

    public function testASubuserWithoutThePermissionIsRefused(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_CONSOLE]);

        $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/step'), ['messages' => [['role' => 'user', 'content' => 'hi']]])
            ->assertForbidden();
    }

    public function testASubuserWithThePermissionMayUseTheAssistant(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_AI_ASSISTANT]);

        $this->mockModel(new UnifiedResponse(text: 'hello'));

        $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/step'), ['messages' => [['role' => 'user', 'content' => 'hi']]])
            ->assertOk()
            ->assertJsonPath('assistant.content', 'hello');
    }

    public function testReadOnlyToolsRunRightAway(): void
    {
        [$user, $server] = $this->generateTestAccount();

        $this->mockModel(new UnifiedResponse(
            text: 'looking',
            toolCalls: [[
                'id' => 'call_0',
                'name' => 'server_info',
                'arguments' => [],
            ]],
        ));

        $response = $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/step'), ['messages' => [['role' => 'user', 'content' => 'hi']]])
            ->assertOk();

        $response->assertJsonCount(1, 'executed');
        $response->assertJsonPath('executed.0.name', 'server_info');
        $response->assertJsonPath('executed.0.ok', true);
        $response->assertJsonCount(0, 'pending');
    }

    public function testMutatingToolsWaitForApproval(): void
    {
        [$user, $server] = $this->generateTestAccount();

        $this->mockModel(new UnifiedResponse(
            text: '',
            toolCalls: [[
                'id' => 'call_0',
                'name' => 'run_command',
                'arguments' => ['command' => 'say hello'],
            ]],
        ));

        $this->mock(DaemonCommandRepository::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('setServer');
        });

        $response = $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/step'), ['messages' => [['role' => 'user', 'content' => 'hi']]])
            ->assertOk();

        $response->assertJsonCount(0, 'executed');
        $response->assertJsonCount(1, 'pending');
        $response->assertJsonPath('pending.0.name', 'run_command');
        $response->assertJsonPath('pending.0.mutates', true);
    }

    public function testBypassModeRunsMutatingToolsRightAway(): void
    {
        [$user, $server] = $this->generateTestAccount();

        $this->mockModel(new UnifiedResponse(
            text: '',
            toolCalls: [[
                'id' => 'call_0',
                'name' => 'run_command',
                'arguments' => ['command' => 'say hello'],
            ]],
        ));

        $this->mock(DaemonCommandRepository::class, function (MockInterface $mock) {
            $mock->expects('setServer->send')->once()->andReturnUndefined();
        });

        $response = $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/step'), [
                'messages' => [['role' => 'user', 'content' => 'hi']],
                'bypass' => true,
            ])
            ->assertOk();

        $response->assertJsonCount(1, 'executed');
        $response->assertJsonPath('executed.0.ok', true);
        $response->assertJsonCount(0, 'pending');
    }

    public function testApprovedCallsAreExecuted(): void
    {
        [$user, $server] = $this->generateTestAccount();

        $this->mock(DaemonCommandRepository::class, function (MockInterface $mock) {
            $mock->expects('setServer->send')->once()->andReturnUndefined();
        });

        $response = $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/execute'), [
                'calls' => [[
                    'id' => 'call_0',
                    'name' => 'run_command',
                    'arguments' => ['command' => 'say hello'],
                ]],
            ])
            ->assertOk();

        $response->assertJsonCount(1, 'executed');
        $response->assertJsonPath('executed.0.ok', true);
    }

    public function testAToolTheUserMayNotUseIsRefused(): void
    {
        // A subuser that may talk to the assistant but not to the console.
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_AI_ASSISTANT]);

        $this->mock(DaemonCommandRepository::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('setServer');
        });

        $response = $this->actingAs($user)
            ->json('POST', $this->stepLink($server, '/execute'), [
                'calls' => [[
                    'id' => 'call_0',
                    'name' => 'run_command',
                    'arguments' => ['command' => 'say hello'],
                ]],
            ])
            ->assertOk();

        $response->assertJsonPath('executed.0.ok', false);
    }

    public function testTheAssistantIsNotOfferedToUsersWithoutThePermission(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $server = $this->createServerModel();

        Subuser::query()->create([
            'user_id' => $user->id,
            'server_id' => $server->id,
            'permissions' => [Permission::ACTION_CONTROL_CONSOLE],
        ]);

        $this->actingAs($user)
            ->json('GET', '/api/client/permissions')
            ->assertOk()
            ->assertJsonPath('attributes.permissions.ai.keys.assistant', 'Allows a user to ask the AI assistant about this server. Changing anything the assistant proposes still requires the permissions for that action.');
    }
}
