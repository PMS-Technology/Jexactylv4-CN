<?php

namespace Everest\Events\Auth;

use Everest\Events\Event;
use Illuminate\Queue\SerializesModels;

class FailedCaptcha extends Event
{
    use SerializesModels;

    /**
     * Create a new event instance. `$domain` is null when the provider could not be
     * reached or rejected the token; `$provider` identifies which service was used.
     */
    public function __construct(
        public string $ip,
        public ?string $domain,
        public ?string $provider = null,
    ) {
    }
}
