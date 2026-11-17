<?php

namespace Everest\Services\Mail;

use Everest\Contracts\Repository\SettingsRepositoryInterface;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

/**
 * The mail configuration of the panel.
 *
 * The settings table is the only source of truth: the MAIL_* environment
 * variables are not read any more, so a panel is configured from the admin
 * settings screen instead of the .env file.
 */
class MailSettings
{
    /**
     * The transports a message can leave through.
     */
    public const DRIVERS = ['smtp', 'log', 'sendmail'];

    /**
     * The encryption modes an SMTP server can use.
     */
    public const ENCRYPTIONS = ['none', 'tls', 'ssl'];

    public function __construct(
        private SettingsRepositoryInterface $settings,
        private ConfigRepository $config,
    ) {
    }

    /**
     * Whether the panel is allowed to deliver mail at all.
     */
    public function enabled(): bool
    {
        return filter_var($this->value('mail:enabled', false), FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * The transport every message is sent through.
     */
    public function driver(): string
    {
        $driver = (string) $this->value('mail:driver', 'log');

        return in_array($driver, self::DRIVERS, true) ? $driver : 'log';
    }

    public function host(): string
    {
        return (string) $this->value('mail:host', '');
    }

    public function port(): int
    {
        $port = (int) $this->value('mail:port', 25);

        return $port > 0 ? $port : 25;
    }

    public function encryption(): string
    {
        $encryption = (string) $this->value('mail:encryption', 'none');

        return in_array($encryption, self::ENCRYPTIONS, true) ? $encryption : 'none';
    }

    public function username(): string
    {
        return (string) $this->value('mail:username', '');
    }

    public function password(): string
    {
        return (string) $this->value('mail:password', '');
    }

    /**
     * The sender address. Without one the panel falls back to the host of the
     * installation URL, so that a saved but empty address cannot break every
     * message that is sent.
     */
    public function fromAddress(): string
    {
        $address = (string) $this->value('mail:from_address', '');
        if ($address !== '') {
            return $address;
        }

        $host = parse_url((string) $this->config->get('app.url'), PHP_URL_HOST);

        return $host ? 'no-reply@' . $host : '';
    }

    public function fromName(): string
    {
        $name = (string) $this->value('mail:from_name', '');

        return $name !== '' ? $name : (string) $this->config->get('app.name');
    }

    /**
     * The configuration for the admin screen. The password is never handed
     * out; the form only shows whether one is stored.
     */
    public function configuration(): array
    {
        return [
            'enabled' => $this->enabled(),
            'driver' => $this->driver(),
            'host' => $this->host(),
            'port' => $this->port(),
            'encryption' => $this->encryption(),
            'username' => $this->username(),
            'from_address' => $this->fromAddress(),
            'from_name' => $this->fromName(),
            'has_password' => $this->password() !== '',
        ];
    }

    /**
     * Copies the stored configuration into the Laravel mail configuration, so
     * that a message leaves through the transport the admin picked.
     */
    public function applyToConfig(): void
    {
        $encryption = $this->encryption();
        $username = $this->username();
        $password = $this->password();

        $this->config->set('mail.default', $this->driver());
        $this->config->set('mail.from.address', $this->fromAddress());
        $this->config->set('mail.from.name', $this->fromName());
        $this->config->set('mail.mailers.smtp', [
            'transport' => 'smtp',
            'scheme' => $encryption === 'ssl' ? 'smtps' : 'smtp',
            'host' => $this->host(),
            'port' => $this->port(),
            'username' => $username !== '' ? $username : null,
            'password' => $password !== '' ? $password : null,
            'timeout' => null,
            'local_domain' => null,
            // STARTTLS is only used when the admin asked for it, so a plain
            // server is not broken by an unexpected upgrade.
            'auto_tls' => $encryption === 'tls',
        ]);
    }

    /**
     * A missing settings table (for example before migrations) must not break
     * the panel; in that case the defaults apply.
     */
    private function value(string $key, mixed $default): mixed
    {
        try {
            $value = $this->settings->get('settings::' . $key, $default);
        } catch (\Throwable) {
            return $default;
        }

        return $value === null ? $default : $value;
    }
}
