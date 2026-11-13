<?php

namespace Everest\Services\Billing\Channels;

use Everest\Exceptions\DisplayException;
use Everest\Enums\Billing\PaymentChannel;

/**
 * Resolves the payment channel a payment method pays through.
 *
 * Several channels can be set up at the same time; the administrator fills in the
 * credentials for each one on the payment channels page. Which of them a purchase
 * goes through is decided by the payment method the customer picked, not by a single
 * channel being switched on.
 */
class ChannelManager
{
    /**
     * @var array<string, class-string<Channel>>
     */
    private array $channels = [
        PaymentChannel::Stripe->value => StripeChannel::class,
        PaymentChannel::Epay->value => EpayChannel::class,
        PaymentChannel::Creem->value => CreemChannel::class,
        PaymentChannel::Waffo->value => WaffoChannel::class,
        PaymentChannel::WaffoPancake->value => WaffoPancakeChannel::class,
    ];

    /**
     * The channel implementation for a channel.
     */
    public function channel(PaymentChannel $channel): Channel
    {
        return app($this->channels[$channel->value]);
    }

    /**
     * The channel implementation a payment method pays through.
     */
    public function channelForRoute(ChannelRoute $route): Channel
    {
        return $this->channel($route->channel);
    }

    /**
     * Checks that the channel a payment method names is set up.
     *
     * A payment method can be offered before its channel has been configured, so the
     * storefront asks this before showing it.
     */
    public function isConfigured(ChannelRoute $route): bool
    {
        return $route->channel->isConfigured();
    }

    /**
     * The channel a payment method names, when it is set up.
     *
     * @throws DisplayException when the channel has not been configured
     */
    public function requireConfigured(ChannelRoute $route): Channel
    {
        if (!$this->isConfigured($route)) {
            throw new DisplayException('The ' . $route->channel->label() . ' payment channel is not fully configured.');
        }

        return $this->channelForRoute($route);
    }

    /**
     * Every channel, with whether it is configured.
     *
     * @return array<int, array<string, mixed>>
     */
    public function channels(): array
    {
        return array_map(function (PaymentChannel $channel) {
            return [
                'id' => $channel->value,
                'label' => $channel->label(),
                'description' => $channel->description(),
                'configured' => $channel->isConfigured(),
                'required_keys' => $channel->requiredKeys(),
                'secret_keys' => $channel->secretKeys(),
                'public_keys' => $channel->publicKeys(),
                'uses_callbacks' => $channel->usesCallbacks(),
                // The address the administrator has to paste into the gateway's dashboard.
                'callback_url' => $channel->usesCallbacks()
                    ? config('app.url') . '/api/client/billing/' . $channel->value . '/notify'
                    : null,
            ];
        }, PaymentChannel::cases());
    }
}
