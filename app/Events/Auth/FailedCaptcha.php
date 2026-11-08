<?php

namespace Everest\Events\Auth;

use Everest\Events\Event;
use Illuminate\Queue\SerializesModels;

class FailedCaptcha extends Event
{
    use SerializesModels;

    /**
     * Create a new event instance. `$domain` is null when Google could not be reached or
     * rejected the token, since only successful responses carry a hostname; typing it as
     * a string turned every failed check into a 500.
     */
    public function __construct(public string $ip, public ?string $domain)
    {
    }
}
