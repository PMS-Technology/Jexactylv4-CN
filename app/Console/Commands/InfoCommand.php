<?php

namespace Everest\Console\Commands;

use Illuminate\Console\Command;
use Everest\Services\Mail\MailSettings;
use Everest\Services\Helpers\SoftwareVersionService;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

class InfoCommand extends Command
{
    protected $description = 'Displays the application, database, and email configurations along with the panel version.';

    protected $signature = 'p:info';

    /**
     * VersionCommand constructor.
     */
    public function __construct(private ConfigRepository $config, private SoftwareVersionService $softwareVersionService, private MailSettings $mail)
    {
        parent::__construct();
    }

    /**
     * Handle execution of command.
     */
    public function handle()
    {
        $this->output->title('Version Information');
        $this->table([], [
            ['Panel Version', $this->softwareVersionService->getCurrentVersion()],
            ['Latest Version', $this->softwareVersionService->getLatestPanel()],
            ['Up-to-Date', $this->softwareVersionService->isLatestPanel() ? 'Yes' : $this->formatText('No', 'bg=red')],
            ['Unique Identifier', $this->config->get('everest.service.author')],
        ], 'compact');

        $this->output->title('Application Configuration');
        $this->table([], [
            ['Environment', $this->formatText($this->config->get('app.env'), $this->config->get('app.env') === 'production' ?: 'bg=red')],
            ['Debug Mode', $this->formatText($this->config->get('app.debug') ? 'Yes' : 'No', !$this->config->get('app.debug') ?: 'bg=red')],
            ['Installation URL', $this->config->get('app.url')],
            ['Installation Directory', base_path()],
            ['Timezone', $this->config->get('app.timezone')],
            ['Cache Driver', $this->config->get('cache.default')],
            ['Queue Driver', $this->config->get('queue.default')],
            ['Session Driver', $this->config->get('session.driver')],
            ['Filesystem Driver', $this->config->get('filesystems.default')],
            ['Default Theme', $this->config->get('themes.active')],
            ['Proxies', $this->config->get('trustedproxies.proxies')],
        ], 'compact');

        $this->output->title('Database Configuration');
        $driver = $this->config->get('database.default');
        $this->table([], [
            ['Driver', $driver],
            ['Host', $this->config->get("database.connections.$driver.host")],
            ['Port', $this->config->get("database.connections.$driver.port")],
            ['Database', $this->config->get("database.connections.$driver.database")],
            ['Username', $this->config->get("database.connections.$driver.username")],
        ], 'compact');

        // The mail settings live in the database, not in the environment, so
        // they are read from the settings table here as well.
        $this->output->title('Mail Configuration');
        $this->table([], [
            ['Delivery', $this->formatText($this->mail->enabled() ? 'Enabled' : 'Disabled', $this->mail->enabled() ? 'bg=green' : 'bg=red')],
            ['Transport', $this->mail->driver()],
            ['Host', $this->mail->host()],
            ['Port', $this->mail->port()],
            ['Encryption', $this->mail->encryption()],
            ['Username', $this->mail->username()],
            ['Sender', $this->mail->fromName() . ' <' . $this->mail->fromAddress() . '>'],
        ], 'compact');
    }

    /**
     * Format output in a Name: Value manner.
     */
    private function formatText(string $value, string $opts = ''): string
    {
        return sprintf('<%s>%s</>', $opts, $value);
    }
}
