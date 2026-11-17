<?php

namespace Everest\Services\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Everest\Exceptions\DisplayException;

/**
 * Delivers the mail of the panel.
 *
 * Every message goes through the transport that is stored in the settings
 * table, so the environment cannot change where the mail of a panel goes.
 */
class MailService
{
    public function __construct(
        private MailSettings $settings,
    ) {
    }

    /**
     * Whether the panel is allowed to deliver mail at all.
     */
    public function enabled(): bool
    {
        return $this->settings->enabled();
    }

    /**
     * The transport the messages are sent through.
     */
    public function driver(): string
    {
        return $this->settings->driver();
    }

    /**
     * Sends a mailable to a single recipient.
     *
     * @throws DisplayException when mail delivery is turned off
     * @throws \Symfony\Component\Mailer\Exception\TransportException when the server rejects the message
     */
    public function send(Mailable $mailable, string $recipient, ?string $name = null): void
    {
        if (!$this->enabled()) {
            throw new DisplayException('Mail delivery is turned off in the panel settings.');
        }

        $this->settings->applyToConfig();

        // The mail manager keeps the transport it built around, so the cached
        // one has to go when the configuration has changed.
        Mail::purge();

        Mail::to($recipient, $name)->send($mailable);
    }
}
