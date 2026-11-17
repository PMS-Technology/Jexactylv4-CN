<?php

namespace Everest\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Queue\SerializesModels;
use Illuminate\Mail\Mailables\Envelope;

/**
 * The message that carries the link a user resets their password with.
 */
class PasswordResetEmail extends Mailable
{
    use Queueable;
    use SerializesModels;

    public function __construct(
        public string $link,
        public int $expiresInMinutes,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[' . config('app.name') . '] Reset your password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.password-reset',
            with: [
                'link' => $this->link,
                'expiresInMinutes' => $this->expiresInMinutes,
            ],
        );
    }
}
