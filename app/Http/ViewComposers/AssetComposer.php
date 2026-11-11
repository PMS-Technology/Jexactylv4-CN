<?php

namespace Everest\Http\ViewComposers;

use Illuminate\View\View;
use Everest\Models\Setting;
use Illuminate\Database\QueryException;
use Everest\Services\Captcha\CaptchaSettings;

class AssetComposer
{
    private const MODES = ['standard', 'personal'];

    public function __construct(private CaptchaSettings $captcha)
    {
    }

    /**
     * Provide access to the asset service in the views.
     */
    public function compose(View $view): void
    {
        $mode = $this->mode();

        // The mode is picked up from the settings table rather than from the config
        // so that it is the same value everywhere in this request.
        config(['app.mode' => $mode]);

        $view->with('siteConfiguration', [
            'name' => config('app.name') ?? 'Everest',
            'logo' => config('app.logo') ?? null,
            'mode' => $mode,
            'setup' => $this->isSetup(),
            'debug' => config('app.debug') ?? false,
            'locale' => config('app.locale') ?? 'en',
            'auto_update' => boolval(config('app.auto_update', false)),
            'speed_dial' => boolval(config('app.speed_dial', false)),
            'indicators' => boolval(config('app.indicators', false)),
            'captcha' => $this->captcha->clientConfiguration(),
            'activity' => [
                'enabled' => [
                    'account' => config('activity.enabled.account', true),
                    'server' => config('activity.enabled.server', true),
                    'admin' => config('activity.enabled.admin', true),
                ],
            ],
        ]);
    }

    /**
     * Whether the setup wizard has been completed.
     *
     * The wizard records completion in the settings table, but with
     * APP_ENVIRONMENT_ONLY=true the SettingsServiceProvider never copies that row into
     * config, so config('app.setup') only reflects APP_SETUP and the wizard came back
     * on every page load. Check the stored row directly as well.
     */
    protected function isSetup(): bool
    {
        if (filter_var(config('app.setup'), FILTER_VALIDATE_BOOLEAN)) {
            return true;
        }

        try {
            return filter_var(Setting::get('settings::app:setup', false), FILTER_VALIDATE_BOOLEAN);
        } catch (QueryException) {
            // No database yet (e.g. before migrations); treat the panel as not set up.
            return false;
        }
    }

    /**
     * The panel mode.
     *
     * The mode is stored in the settings table, but the panel reads it from
     * config('app.mode'), which only the SettingsServiceProvider fills in. With
     * APP_ENVIRONMENT_ONLY=true that provider never runs, so a mode chosen in the
     * admin area was written to the database and then ignored, leaving the panel on
     * the mode it had before. Read the stored row directly, the same way the setup
     * state is handled above.
     */
    protected function mode(): string
    {
        try {
            $mode = Setting::get('settings::app:mode');
        } catch (QueryException) {
            $mode = null;
        }

        if (is_string($mode) && in_array($mode, self::MODES, true)) {
            return $mode;
        }

        $mode = config('app.mode');

        return is_string($mode) && in_array($mode, self::MODES, true) ? $mode : 'standard';
    }
}
