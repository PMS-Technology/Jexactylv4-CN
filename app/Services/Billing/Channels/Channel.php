<?php

namespace Everest\Services\Billing\Channels;

use Everest\Models\Billing\Order;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Services\Billing\CheckoutContext;

/**
 * A payment channel the billing module can check out through.
 *
 * Every channel turns a purchase into a hosted page the customer is redirected to, and
 * then tells the panel that the money arrived. The two halves are separate on purpose:
 * `create` runs before the customer leaves, `process` runs when the panel is told the
 * payment settled.
 */
interface Channel
{
    /**
     * The channel this implementation handles.
     */
    public function channel(): PaymentChannel;

    /**
     * Starts a checkout and returns the URL the customer is sent to.
     *
     * The route says which method within the channel the customer picked; the channel
     * uses it where the gateway takes one, and ignores it where it does not.
     */
    public function create(CheckoutContext $context, ChannelRoute $route): string;

    /**
     * Confirms a payment and returns the order that was fulfilled.
     *
     * The identifier is whatever the customer came back with: a Stripe session id, an
     * Epay trade number, a Creem checkout id.
     */
    public function process(string $identifier): Order;
}
