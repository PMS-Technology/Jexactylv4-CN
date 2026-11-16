<?php

namespace Everest\Tests\Integration\Api\Application\Settings;

use Everest\Models\Setting;
use Illuminate\Http\Response;
use Everest\Services\Panel\PanelMode;
use Everest\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class ModeControllerTest extends ApplicationApiIntegrationTestCase
{
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
     * Test that the selected mode is stored and picked up by the panel.
     */
    public function testModeIsUpdated()
    {
        $response = $this->patchJson('/api/application/settings/mode', ['mode' => 'personal']);

        $response->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseHas('settings', ['key' => 'settings::app:mode', 'value' => 'personal']);
        $this->assertSame(PanelMode::PERSONAL, app(PanelMode::class)->current());
    }

    /**
     * Test that the panel can be put back into standard mode.
     */
    public function testModeIsSwitchedBackToStandard()
    {
        Setting::set('settings::app:mode', 'personal');

        $response = $this->patchJson('/api/application/settings/mode', ['mode' => 'standard']);

        $response->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseHas('settings', ['key' => 'settings::app:mode', 'value' => 'standard']);
        $this->assertSame(PanelMode::STANDARD, app(PanelMode::class)->current());
    }

    /**
     * Test that an unknown mode is rejected.
     */
    public function testUnknownModeIsRejected()
    {
        $response = $this->patchJson('/api/application/settings/mode', ['mode' => 'something-else']);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
        $this->assertDatabaseMissing('settings', ['key' => 'settings::app:mode']);
    }

    /**
     * Test that a request without a mode is rejected instead of clearing the mode.
     */
    public function testMissingModeIsRejected()
    {
        $response = $this->patchJson('/api/application/settings/mode', []);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
        $this->assertDatabaseMissing('settings', ['key' => 'settings::app:mode']);
    }
}
