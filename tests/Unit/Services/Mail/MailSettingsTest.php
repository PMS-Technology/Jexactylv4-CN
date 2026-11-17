<?php

namespace Everest\Tests\Unit\Services\Mail;

use Mockery as m;
use PHPUnit\Framework\TestCase;
use Everest\Services\Mail\MailSettings;
use Illuminate\Config\Repository as ConfigRepository;
use Everest\Contracts\Repository\SettingsRepositoryInterface;

class MailSettingsTest extends TestCase
{
    /**
     * The configuration the service writes into.
     */
    private ConfigRepository $config;

    /**
     * Build the service with a mocked settings repository and a real config repository.
     *
     * @param array<string, string> $stored the values in the settings table
     */
    private function service(array $stored = []): MailSettings
    {
        $settings = m::mock(SettingsRepositoryInterface::class);
        $settings->shouldReceive('get')
            ->andReturnUsing(function (string $key, mixed $default = null) use ($stored) {
                $name = str_replace('settings::mail:', '', $key);

                return array_key_exists($name, $stored) ? $stored[$name] : $default;
            });

        $this->config = new ConfigRepository([
            'app' => ['url' => 'https://panel.example.com', 'name' => 'Example Panel'],
        ]);

        return new MailSettings($settings, $this->config);
    }

    /**
     * Test that a panel without any stored settings does not send mail.
     */
    public function testDefaultsAreUsedWhenNothingIsStored()
    {
        $settings = $this->service();

        $this->assertFalse($settings->enabled());
        $this->assertSame('log', $settings->driver());
        $this->assertSame(25, $settings->port());
        $this->assertSame('none', $settings->encryption());
        $this->assertSame('', $settings->host());
        $this->assertSame('no-reply@panel.example.com', $settings->fromAddress());
        $this->assertSame('Example Panel', $settings->fromName());
    }

    /**
     * Test that the stored values are used.
     */
    public function testStoredValuesAreUsed()
    {
        $settings = $this->service([
            'enabled' => 'true',
            'driver' => 'smtp',
            'host' => 'smtp.example.com',
            'port' => '587',
            'encryption' => 'tls',
            'username' => 'panel@example.com',
            'password' => 'secret',
            'from_address' => 'no-reply@example.com',
            'from_name' => 'ZOZ Panel',
        ]);

        $this->assertTrue($settings->enabled());
        $this->assertSame('smtp', $settings->driver());
        $this->assertSame('smtp.example.com', $settings->host());
        $this->assertSame(587, $settings->port());
        $this->assertSame('tls', $settings->encryption());
        $this->assertSame('panel@example.com', $settings->username());
        $this->assertSame('secret', $settings->password());
        $this->assertSame('no-reply@example.com', $settings->fromAddress());
        $this->assertSame('ZOZ Panel', $settings->fromName());
    }

    /**
     * Test that an unknown transport or encryption falls back to a safe value.
     */
    public function testUnknownValuesFallBack()
    {
        $settings = $this->service([
            'driver' => 'carrier-pigeon',
            'encryption' => 'rot13',
            'port' => '0',
        ]);

        $this->assertSame('log', $settings->driver());
        $this->assertSame('none', $settings->encryption());
        $this->assertSame(25, $settings->port());
    }

    /**
     * Test that the password is never handed out, but that its presence is.
     */
    public function testConfigurationDoesNotContainThePassword()
    {
        $configuration = $this->service(['password' => 'secret'])->configuration();

        $this->assertArrayNotHasKey('password', $configuration);
        $this->assertTrue($configuration['has_password']);
        $this->assertFalse($this->service()->configuration()['has_password']);
    }

    /**
     * Test that the stored configuration is copied into the Laravel mail configuration.
     */
    public function testConfigurationIsCopiedIntoTheMailConfig()
    {
        $service = $this->service([
            'driver' => 'smtp',
            'host' => 'smtp.example.com',
            'port' => '465',
            'encryption' => 'ssl',
            'username' => 'panel@example.com',
            'password' => 'secret',
            'from_address' => 'no-reply@example.com',
            'from_name' => 'ZOZ Panel',
        ]);

        $service->applyToConfig();

        $this->assertSame('smtp', $this->config->get('mail.default'));
        $this->assertSame('smtps', $this->config->get('mail.mailers.smtp.scheme'));
        $this->assertSame('smtp.example.com', $this->config->get('mail.mailers.smtp.host'));
        $this->assertSame(465, $this->config->get('mail.mailers.smtp.port'));
        $this->assertSame('panel@example.com', $this->config->get('mail.mailers.smtp.username'));
        $this->assertSame('secret', $this->config->get('mail.mailers.smtp.password'));
        $this->assertSame('no-reply@example.com', $this->config->get('mail.from.address'));
        $this->assertSame('ZOZ Panel', $this->config->get('mail.from.name'));
    }

    /**
     * Test that STARTTLS is only used when the admin asked for it.
     */
    public function testStartTlsIsOnlyUsedWhenItWasAskedFor()
    {
        $service = $this->service(['encryption' => 'tls', 'driver' => 'smtp']);
        $service->applyToConfig();

        $this->assertTrue($this->config->get('mail.mailers.smtp.auto_tls'));
        $this->assertSame('smtp', $this->config->get('mail.mailers.smtp.scheme'));

        $service = $this->service(['encryption' => 'none', 'driver' => 'smtp']);
        $service->applyToConfig();

        $this->assertFalse($this->config->get('mail.mailers.smtp.auto_tls'));
    }
}
