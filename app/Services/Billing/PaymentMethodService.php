<?php

namespace Everest\Services\Billing;

use Everest\Exceptions\DisplayException;
use Everest\Models\Billing\PaymentMethod;
use Everest\Services\Billing\Channels\ChannelRoute;

/**
 * The payment methods a customer can choose from at checkout.
 *
 * A method names the channel it pays through and, for the channels that serve more
 * than one, which of them it is: `epay:wxpay` is the WeChat Pay method of the Epay
 * channel. The customer picks a method and the panel takes it from there.
 */
class PaymentMethodService
{
    /**
     * The methods that are offered at checkout.
     *
     * A method whose channel has not been configured is left out, so the customer is
     * never offered a way to pay that cannot be completed.
     *
     * @return \Illuminate\Support\Collection<int, PaymentMethod>
     */
    public function available(): \Illuminate\Support\Collection
    {
        return PaymentMethod::query()
            ->where('enabled', true)
            ->orderBy('sort')
            ->orderBy('id')
            ->get()
            ->filter(fn (PaymentMethod $method) => $method->channel()?->isConfigured())
            ->values();
    }

    /**
     * Finds a payment method by its identifier.
     */
    public function findByIdentifier(string $identifier): ?PaymentMethod
    {
        return PaymentMethod::query()
            ->where('identifier', trim($identifier))
            ->where('enabled', true)
            ->first();
    }

    /**
     * Reads the route a payment method identifier sends the customer through.
     *
     * @throws DisplayException when the identifier names no known channel
     */
    public function routeFor(string $identifier): ChannelRoute
    {
        try {
            return ChannelRoute::fromIdentifier($identifier);
        } catch (\InvalidArgumentException $exception) {
            throw new DisplayException($exception->getMessage());
        }
    }

    /**
     * The method a checkout should pay through.
     *
     * The customer sends the identifier of the method they picked. It has to be a
     * method that is actually offered, so that a method that was turned off cannot be
     * used by calling the endpoint directly.
     *
     * @throws DisplayException when the method is unknown or not offered
     */
    public function methodFor(string $identifier): PaymentMethod
    {
        $method = $this->findByIdentifier($identifier);

        if (!$method) {
            throw new DisplayException('This payment method is not available.');
        }

        $channel = $method->channel();

        if (!$channel) {
            throw new DisplayException('This payment method is not available.');
        }

        if (!$channel->isConfigured()) {
            throw new DisplayException('The ' . $channel->label() . ' payment channel is not fully configured.');
        }

        return $method;
    }
}
