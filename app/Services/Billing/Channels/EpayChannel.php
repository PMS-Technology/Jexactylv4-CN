<?php

namespace Everest\Services\Billing\Channels;

use Everest\Models\Billing\Order;
use Everest\Exceptions\DisplayException;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Services\Billing\CheckoutContext;
use Everest\Services\Billing\CreateOrderService;
use Everest\Services\Billing\PaymentFulfillmentService;

/**
 * The Epay (易支付) protocol.
 *
 * Epay is not a hosted API: the panel builds a signed query string, sends the customer
 * to the merchant's own `submit.php` page, and that page calls back with the result.
 * The signature is an MD5 over the sorted parameters plus the merchant key, which is
 * the scheme the widely-deployed Epay builds use.
 *
 * Epay serves several payment methods through the same gateway, so the method the
 * customer picked travels as its `type` parameter — `epay:wxpay` becomes `wxpay`.
 */
class EpayChannel implements Channel
{
    public function __construct(
        private CreateOrderService $orderService,
        private PaymentFulfillmentService $fulfillmentService,
    ) {
    }

    public function channel(): PaymentChannel
    {
        return PaymentChannel::Epay;
    }

    public function create(CheckoutContext $context, ChannelRoute $route): string
    {
        $gatewayUrl = $this->gatewayUrl();

        $params = $this->checkoutParameters($context, $route);
        $params['sign'] = $this->sign($params);
        $params['sign_type'] = 'MD5';

        // The order is created up front so the callback has something to find. The
        // reference is the trade number, which is what the callback echoes back.
        $this->orderService->create(
            $params['out_trade_no'],
            $context->user,
            $context->product,
            Order::STATUS_PENDING,
            $context->orderType(),
            $context->price,
            $context->orderMetadata(),
        );

        return $gatewayUrl . '/submit.php?' . http_build_query($params);
    }

    /**
     * The parameters the merchant's own payment page is given.
     *
     * The `type` parameter is the payment method within the Epay channel: `epay:wxpay`
     * sends `wxpay`. A method that names no Epay type falls back to the one Epay
     * treats as the default.
     *
     * @return array<string, string>
     */
    public function checkoutParameters(CheckoutContext $context, ChannelRoute $route): array
    {
        return [
            'pid' => (string) $this->channel()->setting('pid'),
            'type' => $route->subtype ?? 'alipay',
            'out_trade_no' => $context->reference,
            'notify_url' => $this->callbackUrl(),
            'return_url' => $this->returnUrl($context->reference),
            'name' => $context->product->name,
            'money' => number_format($context->total(), 2, '.', ''),
            'clientip' => $context->user->last_ip ?? '127.0.0.1',
        ];
    }

    public function process(string $identifier): Order
    {
        $order = Order::where('transaction_id', $identifier)->firstOrFail();

        $this->fulfillmentService->fulfill($order, (array) $order->metadata);

        return $order->fresh();
    }

    /**
     * Signs a set of parameters the way Epay expects.
     *
     * The signature and the sign type are left out, the rest are sorted by name and
     * concatenated as `namevalue` pairs with no separator, and the merchant key is
     * appended before hashing.
     */
    public function sign(array $params, ?string $key = null): string
    {
        $key ??= (string) $this->channel()->setting('key');

        unset($params['sign'], $params['sign_type'], $params['key']);

        // Empty values are not part of the signature.
        $params = array_filter($params, fn ($value) => $value !== null && $value !== '');

        ksort($params);

        $source = '';
        foreach ($params as $name => $value) {
            $source .= $name . $value;
        }

        return md5($source . $key);
    }

    /**
     * Checks the signature of a callback and returns the parameters when it holds.
     */
    public function verify(array $params, ?string $key = null): bool
    {
        $received = (string) ($params['sign'] ?? '');

        if ($received === '') {
            return false;
        }

        return hash_equals($this->sign($params, $key), $received);
    }

    private function callbackUrl(): string
    {
        return config('app.url') . '/api/client/billing/epay/notify';
    }

    /**
     * The address of the merchant's own payment page, which the customer is sent to.
     *
     * @throws DisplayException when the channel has not been configured
     */
    private function gatewayUrl(): string
    {
        $pid = (string) $this->channel()->setting('pid');
        $key = (string) $this->channel()->setting('key');
        $url = rtrim((string) $this->channel()->setting('gateway_url'), '/');

        if ($pid === '' || $key === '' || $url === '') {
            throw new DisplayException('The Epay channel is not configured.');
        }

        return $url;
    }

    /**
     * Where the customer lands after paying. The reference ties the return to the
     * order the checkout was created for.
     */
    private function returnUrl(string $reference): string
    {
        return config('app.url') . '/account/billing/processing?reference=' . urlencode($reference);
    }
}
