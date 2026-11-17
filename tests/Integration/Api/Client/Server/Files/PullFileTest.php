<?php

namespace Everest\Tests\Integration\Api\Client\Server\Files;

use Mockery\MockInterface;
use GuzzleHttp\Psr7\Response;
use Everest\Models\Permission;
use Everest\Repositories\Wings\DaemonFileRepository;
use Everest\Tests\Integration\Api\Client\ClientApiIntegrationTestCase;

class PullFileTest extends ClientApiIntegrationTestCase
{
    public function testEndpointRequiresAuthorization(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_CONTROL_CONSOLE]);

        $this->postJson($this->link($server, '/files/pull'))->assertUnauthorized();

        $this->actingAs($user)
            ->postJson($this->link($server, '/files/pull'))
            ->assertForbidden();
    }

    public function testEndpointTriggersWingsCall(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);

        $this->mock(DaemonFileRepository::class, function (MockInterface $mock) {
            $mock->expects('setServer->pull')
                ->with(
                    'https://example.com/file.zip',
                    '/plugins',
                    \Mockery::on(fn ($params) => $params['filename'] === 'plugin.jar'
                        && $params['foreground'] === false),
                )
                ->andReturn(new Response());
        });

        $this->actingAs($user)
            ->postJson($this->link($server, '/files/pull'), [
                'url' => 'https://example.com/file.zip',
                'directory' => '/plugins',
                'filename' => 'plugin.jar',
                'foreground' => false,
            ])
            ->assertNoContent();

        $this->assertActivityLogged('server:file.pull');
    }

    public function testEndpointRequiresUrl(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);

        $this->actingAs($user)
            ->postJson($this->link($server, '/files/pull'), [])
            ->assertUnprocessable()
            ->assertJsonPath('errors.0.meta', ['source_field' => 'url', 'rule' => 'required']);
    }

    /**
     * The daemon fetches the URL on the node, so only real web schemes may through.
     * Laravel's bare `url` rule would happily accept `file://` and friends.
     */
    public function testEndpointRejectsNonHttpSchemes(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);

        $this->actingAs($user)
            ->postJson($this->link($server, '/files/pull'), ['url' => 'file://localhost/etc/passwd'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.0.meta', ['source_field' => 'url', 'rule' => 'url']);
    }

    public function testEndpointRejectsPathsInFilename(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);

        $this->actingAs($user)
            ->postJson($this->link($server, '/files/pull'), [
                'url' => 'https://example.com/file.zip',
                'filename' => '../../etc/passwd',
            ])
            ->assertUnprocessable();
    }

    public function testEndpointRejectsParentDirectoryReferences(): void
    {
        [$user, $server] = $this->generateTestAccount([Permission::ACTION_FILE_CREATE]);

        $this->actingAs($user)
            ->postJson($this->link($server, '/files/pull'), [
                'url' => 'https://example.com/file.zip',
                'directory' => '/plugins/../../',
            ])
            ->assertUnprocessable();
    }
}
