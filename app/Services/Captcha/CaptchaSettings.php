<?php

namespace Everest\Services\Captcha;

use Everest\Contracts\Repository\SettingsRepositoryInterface;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

/**
 * Reads the captcha configuration from the settings table.
 *
 * The settings table is the source of truth for the switch, the selected
 * provider and every credential. Config values are only defaults, which keeps
 * a fresh installation disabled even when no settings row exists yet.
 */
class CaptchaSettings
{
    public const PROVIDERS = ['recaptcha', 'hcaptcha', 'turnstile', 'geetest', 'corptcha'];

    public function __construct(
        private SettingsRepositoryInterface $settings,
        private ConfigRepository $config,
    ) {
    }

    public function enabled(): bool
    {
        return filter_var(
            $this->value('captcha:enabled', $this->config->get('captcha.enabled', false)),
            FILTER_VALIDATE_BOOLEAN
        );
    }

    public function provider(): string
    {
        $provider = (string) $this->value('captcha:provider', $this->config->get('captcha.provider', 'recaptcha'));

        return in_array($provider, self::PROVIDERS, true) ? $provider : 'recaptcha';
    }

    public function siteKey(?string $provider = null): string
    {
        $provider = $this->normalizeProvider($provider);

        return (string) $this->value(
            "captcha:{$provider}:site_key",
            $this->config->get("captcha.{$provider}.site_key", '')
        );
    }

    public function secretKey(?string $provider = null): string
    {
        $provider = $this->normalizeProvider($provider);

        return (string) $this->value(
            "captcha:{$provider}:secret_key",
            $this->config->get("captcha.{$provider}.secret_key", '')
        );
    }

    public function apiBase(): string
    {
        $value = (string) $this->value(
            'captcha:corptcha:api_base',
            $this->config->get('captcha.corptcha.api_base', 'https://cpt-api.25y.cn')
        );

        return rtrim($value !== '' ? $value : 'https://cpt-api.25y.cn', '/');
    }

    public function verifyUrl(string $provider): string
    {
        return (string) $this->config->get("captcha.{$provider}.verify_url", '');
    }

    public function scriptUrl(?string $provider = null): string
    {
        $provider = $this->normalizeProvider($provider);

        return (string) $this->config->get("captcha.{$provider}.script_url", '');
    }

    public function verifyDomain(): bool
    {
        return filter_var($this->config->get('captcha.verify_domain', true), FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Public configuration required by the browser. Secret keys are never included;
     * only whether one has been stored, so the admin form can render a placeholder.
     */
    public function clientConfiguration(): array
    {
        $provider = $this->provider();

        $siteKeys = [];
        $hasSecret = [];
        foreach (self::PROVIDERS as $candidate) {
            $siteKeys[$candidate] = $this->siteKey($candidate);
            $hasSecret[$candidate] = $this->secretKey($candidate) !== '';
        }

        return [
            'enabled' => $this->enabled(),
            'provider' => $provider,
            'siteKey' => $siteKeys[$provider],
            'scriptUrl' => $this->scriptUrl($provider),
            'apiBase' => $this->apiBase(),
            'siteKeys' => $siteKeys,
            'hasSecret' => $hasSecret,
        ];
    }

    /**
     * A missing settings table (for example before migrations) must not break the
     * panel; in that case the config defaults apply.
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

    private function normalizeProvider(?string $provider): string
    {
        return $provider !== null && in_array($provider, self::PROVIDERS, true)
            ? $provider
            : $this->provider();
    }
}
