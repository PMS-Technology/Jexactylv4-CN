<?php

namespace Everest\Tests\Integration\Api\Application\Settings;

use Everest\Mail\TestEmail;
use Everest\Models\Setting;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Mail;
use Everest\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class MailControllerTest extends ApplicationApiIntegrationTestCase
{
    /**
     * The settings of the mail configuration.
     */
    private array $keys = [
        'enabled', 'driver', 'host', 'port', 'encryption', 'username', 'password', 'from_address', 'from_name',
    ];

    /**
     * The settings repository caches values for the lifetime of the process, so the
     * stored mail settings have to be removed after every test.
     */
    protected function tearDown(): void
    {
        foreach ($this->keys as $key) {
            Setting::forget('settings::mail:' . $key);
        }

        parent::tearDown();
    }

    /**
     * A full set of mail settings, as the settings screen sends them.
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'enabled' => true,
            'driver' => 'smtp',
            'host' => 'smtp.example.com',
            'port' => 587,
            'encryption' => 'tls',
            'username' => 'panel@example.com',
            'password' => 'secret',
            'from_address' => 'no-reply@example.com',
            'from_name' => 'ZOZ Panel',
        ], $overrides);
    }

    /**
     * Test that the stored configuration is handed to the settings screen.
     */
    public function testSettingsAreReturned()
    {
        Setting::set('settings::mail:driver', 'smtp');
        Setting::set('settings::mail:host', 'smtp.example.com');

        $response = $this->getJson('/api/application/settings/mail');

        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonPath('driver', 'smtp');
        $response->assertJsonPath('host', 'smtp.example.com');
        $response->assertJsonPath('enabled', false);
        $response->assertJsonPath('has_password', false);
    }

    /**
     * Test that the password is never handed out to the browser.
     */
    public function testThePasswordIsNotReturned()
    {
        Setting::set('settings::mail:password', 'secret');

        $response = $this->getJson('/api/application/settings/mail');

        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonPath('has_password', true);
        $this->assertArrayNotHasKey('password', $response->json());
    }

    /**
     * Test that the configuration is stored in the settings table.
     */
    public function testSettingsAreStored()
    {
        $response = $this->patchJson('/api/application/settings/mail', $this->payload());

        $response->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:enabled', 'value' => 'true']);
        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:driver', 'value' => 'smtp']);
        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:host', 'value' => 'smtp.example.com']);
        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:port', 'value' => '587']);
        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:encryption', 'value' => 'tls']);
        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:password', 'value' => 'secret']);
        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:from_address', 'value' => 'no-reply@example.com']);
    }

    /**
     * Test that the stored password survives a save that does not carry it.
     */
    public function testTheStoredPasswordIsKeptWhenItIsNotSent()
    {
        Setting::set('settings::mail:password', 'secret');

        $response = $this->patchJson('/api/application/settings/mail', $this->payload(['password' => '']));

        $response->assertStatus(Response::HTTP_NO_CONTENT);

        $this->assertDatabaseHas('settings', ['key' => 'settings::mail:password', 'value' => 'secret']);
    }

    /**
     * Test that an unknown transport is rejected.
     */
    public function testAnUnknownDriverIsRejected()
    {
        $response = $this->patchJson('/api/application/settings/mail', $this->payload(['driver' => 'carrier-pigeon']));

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
        $this->assertDatabaseMissing('settings', ['key' => 'settings::mail:driver']);
    }

    /**
     * Test that a message is sent through the configured transport.
     */
    public function testATestMailIsSent()
    {
        Mail::fake();

        Setting::set('settings::mail:enabled', 'true');
        Setting::set('settings::mail:driver', 'log');

        $response = $this->postJson('/api/application/settings/mail/test', ['email' => 'admin@example.com']);

        $response->assertStatus(Response::HTTP_NO_CONTENT);

        Mail::assertSent(TestEmail::class, function (TestEmail $mail) {
            return $mail->hasTo('admin@example.com');
        });
    }

    /**
     * Test that no message is sent when mail delivery is turned off.
     */
    public function testATestMailIsRefusedWhenMailIsTurnedOff()
    {
        Mail::fake();

        $response = $this->postJson('/api/application/settings/mail/test', ['email' => 'admin@example.com']);

        $response->assertStatus(Response::HTTP_BAD_REQUEST);

        Mail::assertNothingSent();
    }

    /**
     * Test that a test mail needs a valid address.
     */
    public function testATestMailNeedsAnAddress()
    {
        Mail::fake();

        $response = $this->postJson('/api/application/settings/mail/test', ['email' => 'not-an-address']);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);

        Mail::assertNothingSent();
    }
}
