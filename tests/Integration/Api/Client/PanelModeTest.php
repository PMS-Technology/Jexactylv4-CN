<?php

namespace Everest\Tests\Integration\Api\Client;

use Everest\Models\User;
use Everest\Models\Setting;
use Illuminate\Http\Response;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class PanelModeTest extends ClientApiIntegrationTestCase
{
    use DatabaseTransactions;

    /**
     * The settings repository caches values for the lifetime of the process, so the
     * stored mode has to be removed after every test.
     */
    protected function tearDown(): void
    {
        Setting::forget('settings::app:mode');

        parent::tearDown();
    }

    /**
     * Put the panel into the given mode.
     */
    private function setMode(string $mode): void
    {
        Setting::set('settings::app:mode', $mode);
    }

    /**
     * Test that the billing endpoints are closed in personal mode.
     */
    public function testBillingIsBlockedInPersonalMode()
    {
        $this->setMode('personal');
        config()->set('modules.billing.enabled', true);

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/client/billing/orders');

        $response->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /**
     * Test that the billing endpoints are reachable in standard mode.
     */
    public function testBillingIsAvailableInStandardMode()
    {
        $this->setMode('standard');
        config()->set('modules.billing.enabled', true);

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/client/billing/orders');

        $response->assertStatus(Response::HTTP_OK);
    }

    /**
     * Test that the ticket endpoints are closed in personal mode.
     */
    public function testTicketsAreBlockedInPersonalMode()
    {
        $this->setMode('personal');
        config()->set('modules.tickets.enabled', true);

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/client/account/tickets');

        $response->assertStatus(Response::HTTP_FORBIDDEN);
    }

    /**
     * Test that the ticket endpoints are reachable in standard mode.
     */
    public function testTicketsAreAvailableInStandardMode()
    {
        $this->setMode('standard');
        config()->set('modules.tickets.enabled', true);

        /** @var User $user */
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/client/account/tickets');

        $response->assertStatus(Response::HTTP_OK);
    }
}
