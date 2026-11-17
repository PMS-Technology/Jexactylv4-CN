<?php

namespace Everest\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Envelope;

/**
 * The message the settings screen sends to check the mail configuration.
 */
class TestEmail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(public string $recipient)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[' . config('app.name') . '] Mail delivery test',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.test',
            with: ['recipient' => $this->recipient],
        );
    }
}
