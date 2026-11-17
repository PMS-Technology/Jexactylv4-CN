<?php

namespace Everest\Tests\Integration\Http\Controllers\Auth;

use Everest\Models\User;
use Everest\Models\Setting;
use Illuminate\Http\Response;
use Everest\Mail\PasswordResetEmail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Everest\Tests\Integration\Http\HttpTestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;

class ForgotPasswordControllerTest extends HttpTestCase
{
    use DatabaseTransactions;
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
     * Turn the mail delivery on for the test.
     */
    private function enableMail(): void
    {
        Setting::set('settings::mail:enabled', 'true');
        Setting::set('settings::mail:driver', 'log');
    }

    /**
     * Test that a reset link is mailed to the address of an account.
     */
    public function testAResetLinkIsSentToTheAddressOfAnAccount()
    {
        Mail::fake();
        $this->enableMail();

        $user = User::factory()->create(['email' => 'user@example.com']);

        $response = $this->postJson('/auth/password/email', ['email' => 'user@example.com']);

        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonPath('data.complete', true);

        Mail::assertSent(PasswordResetEmail::class, function (PasswordResetEmail $mail) use ($user) {
            return $mail->hasTo($user->email);
        });

        $this->assertDatabaseHas('password_resets', ['email' => 'user@example.com']);
    }

    /**
     * Test that an address without an account is answered the same way, so that
     * the endpoint cannot be used to find out who is registered.
     */
    public function testTheAnswerIsTheSameForAnUnknownAddress()
    {
        Mail::fake();
        $this->enableMail();

        $response = $this->postJson('/auth/password/email', ['email' => 'nobody@example.com']);

        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonPath('data.complete', true);

        Mail::assertNothingSent();
        $this->assertDatabaseMissing('password_resets', ['email' => 'nobody@example.com']);
    }

    /**
     * Test that nothing is sent when the panel does not deliver mail.
     */
    public function testNoLinkIsSentWhenMailIsTurnedOff()
    {
        Mail::fake();

        $response = $this->postJson('/auth/password/email', ['email' => 'user@example.com']);

        $response->assertStatus(Response::HTTP_BAD_REQUEST);

        Mail::assertNothingSent();
    }

    /**
     * Test that the address has to look like an address.
     */
    public function testAnAddressIsRequired()
    {
        Mail::fake();
        $this->enableMail();

        $response = $this->postJson('/auth/password/email', ['email' => 'not-an-address']);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);

        Mail::assertNothingSent();
    }

    /**
     * Test that the link that was mailed can be used to set a new password.
     */
    public function testTheMailedLinkSetsANewPassword()
    {
        Mail::fake();
        $this->enableMail();

        $user = User::factory()->create(['email' => 'user@example.com']);

        $this->postJson('/auth/password/email', ['email' => 'user@example.com'])->assertStatus(Response::HTTP_OK);

        $link = null;
        Mail::assertSent(PasswordResetEmail::class, function (PasswordResetEmail $mail) use (&$link) {
            $link = $mail->link;

            return true;
        });

        $this->assertNotNull($link);

        parse_str((string) parse_url($link, PHP_URL_QUERY), $query);
        $token = basename((string) parse_url($link, PHP_URL_PATH));

        $response = $this->postJson('/auth/password/reset', [
            'email' => 'user@example.com',
            'token' => $token,
            'password' => 'a-new-password',
            'password_confirmation' => 'a-new-password',
        ]);

        $response->assertStatus(Response::HTTP_OK);

        $this->assertTrue(Hash::check('a-new-password', $user->refresh()->password));
        $this->assertDatabaseMissing('password_resets', ['email' => 'user@example.com']);
    }
}
