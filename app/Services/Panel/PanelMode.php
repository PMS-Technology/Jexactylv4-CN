<?php

namespace Everest\Services\Panel;

use Everest\Contracts\Repository\SettingsRepositoryInterface;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

/**
 * The panel mode.
 *
 * The mode is stored in the settings table and decides which features the panel
 * offers. Standard mode is the full feature set aimed at hosting providers,
 * personal mode drops the features that only matter at that scale (billing,
 * tickets and public registration).
 *
 * The settings table is the source of truth. The config value is only a default,
 * so a mode picked in the admin area is honoured even when the panel runs with
 * APP_ENVIRONMENT_ONLY enabled and the settings provider never copies the row
 * into the config.
 */
class PanelMode
{
    public const STANDARD = 'standard';
    public const PERSONAL = 'personal';

    /**
     * Features that only exist in standard mode.
     */
    public const STANDARD_ONLY = ['billing', 'tickets', 'registration'];

    public function __construct(
        private SettingsRepositoryInterface $settings,
        private ConfigRepository $config,
    ) {
    }

    /**
     * The active mode, always one of the two known modes.
     */
    public function current(): string
    {
        $mode = $this->value('app:mode', $this->config->get('app.mode', self::STANDARD));

        return in_array($mode, [self::STANDARD, self::PERSONAL], true) ? $mode : self::STANDARD;
    }

    public function isStandard(): bool
    {
        return $this->current() === self::STANDARD;
    }

    public function isPersonal(): bool
    {
        return $this->current() === self::PERSONAL;
    }

    /**
     * Whether a feature may be used in the current mode.
     *
     * Features that are not mode dependent are always allowed; the caller still
     * has to check the module's own switch.
     */
    public function allows(string $feature): bool
    {
        return !($this->isPersonal() && in_array($feature, self::STANDARD_ONLY, true));
    }

    /**
     * A missing settings table (for example before migrations) must not break the
     * panel; in that case the config default applies.
     */
    private function value(string $key, mixed $default): mixed
    {
        try {
            $value = $this->settings->get('settings::' . $key, $default);
        } catch (\Throwable) {
            return $default;
        }

        return $value === null || $value === '' ? $default : $value;
    }
}
