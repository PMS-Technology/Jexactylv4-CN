<?php

namespace Everest\Services\Billing\Channels;

use Everest\Enums\Billing\PaymentChannel;

/**
 * Where a payment identifier sends the customer.
 *
 * A payment method is addressed by an identifier: the channel's own name, optionally
 * followed by a colon and the method within that channel. `stripe` is Stripe itself,
 * `epay:wxpay` is the WeChat Pay method of the Epay channel, and `waffo_pancake` is
 * the Pancake channel.
 *
 * Only the channels that serve several methods care about the second part: for Epay it
 * is the `type` the gateway is asked for. The other channels have one flow each, so
 * the second part is null for them.
 */
final readonly class ChannelRoute
{
    public function __construct(
        public PaymentChannel $channel,
        public ?string $subtype = null,
    ) {
    }

    /**
     * Reads a payment method identifier.
     *
     * The part before the colon names the channel; the part after it names the method
     * within that channel.
     */
    public static function fromIdentifier(string $identifier): self
    {
        $parts = explode(':', trim($identifier), 2);

        $channel = PaymentChannel::tryFrom($parts[0]);

        if (!$channel) {
            throw new \InvalidArgumentException('Unknown payment channel: ' . $parts[0]);
        }

        $subtype = isset($parts[1]) && $parts[1] !== '' ? $parts[1] : null;

        // A channel with a single flow has nothing to pick from, so the method part is
        // only kept for the channels that actually use one.
        if (!$channel->supportsSubtypes()) {
            $subtype = null;
        }

        return new self($channel, $subtype);
    }

    /**
     * The identifier this route came from.
     */
    public function identifier(): string
    {
        return $this->subtype === null
            ? $this->channel->value
            : $this->channel->value . ':' . $this->subtype;
    }
}
