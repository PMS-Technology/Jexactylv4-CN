<?php

namespace Everest\Services\Billing;

use Everest\Models\User;
use Everest\Models\Billing\Product;

/**
 * Everything a purchase needs, gathered in one place.
 *
 * The client sends the same details whichever payment method is used, so the
 * controller collects them once and hands them to the channel. That keeps the channels
 * from each re-deriving the order metadata, which is what the invoice is later built
 * from.
 */
class CheckoutContext
{
    /**
     * The reference the gateway and the panel use to talk about this purchase.
     *
     * It travels through the gateway as the merchant order id, so the payment
     * notification can be matched back to the order without trusting anything else in
     * the callback.
     */
    public readonly string $reference;

    /**
     * @param array<string, mixed> $metadata the details the panel needs to fulfil the
     *                                       purchase once the payment lands
     * @param float|null $price the price after any discount, when one applies
     * @param float $deploymentFee the one-time fee for the node the server lands on
     * @param string|null $paymentChannel the channel the money is collected through
     */
    public function __construct(
        public readonly User $user,
        public readonly Product $product,
        public readonly array $metadata,
        public readonly ?float $price = null,
        public readonly float $deploymentFee = 0.0,
        public readonly ?string $paymentChannel = null,
    ) {
        $this->reference = 'PD' . $user->id . '-' . $product->id . '-' . substr(bin2hex(random_bytes(8)), 0, 12);
    }

    /**
     * The order type: a new server, a renewal or an upgrade.
     */
    public function orderType(): string
    {
        return (string) $this->metadata['order_type'];
    }

    /**
     * The price the customer is charged, before any discount.
     */
    public function subtotal(): float
    {
        return (float) $this->product->price;
    }

    /**
     * The total the customer is charged.
     */
    public function total(): float
    {
        return ($this->price ?? $this->subtotal()) + $this->deploymentFee;
    }

    /**
     * The currency the customer is charged in.
     *
     * Usually the panel's currency, but the crypto channels charge in a stablecoin, so
     * the amount that comes back is compared against this rather than the panel's
     * currency.
     */
    public function currency(): string
    {
        return strtoupper((string) config('modules.billing.currency.code'));
    }

    /**
     * The details stored on the order.
     *
     * The whole checkout is kept, not just the amounts, because the payment
     * notification may be the only thing that arrives after the customer has been
     * redirected — the panel needs the server, the egg and the variables from here to
     * carry the purchase out.
     */
    public function orderMetadata(): array
    {
        return array_merge($this->metadata, array_filter([
            'deployment_fee' => $this->deploymentFee > 0 ? $this->deploymentFee : null,
            'subtotal' => $this->price !== null ? $this->subtotal() : null,
        ], fn ($value) => $value !== null), [
            'payment_request_id' => $this->reference,
            'currency' => $this->currency(),
            // The channel the money is collected through, so the panel can confirm the
            // payment with the same channel when the customer comes back.
            'payment_channel' => $this->paymentChannel,
        ]);
    }
}
