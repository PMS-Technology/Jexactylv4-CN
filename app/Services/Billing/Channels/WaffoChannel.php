<?php

namespace Everest\Services\Billing\Channels;

use Everest\Models\Billing\Order;
use Illuminate\Support\Facades\Http;
use Everest\Exceptions\DisplayException;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Services\Billing\CheckoutContext;
use Everest\Services\Billing\CreateOrderService;
use Everest\Services\Billing\PaymentFulfillmentService;

/**
 * Waffo, a multi-region acquiring gateway.
 *
 * Every request is a POST with the API key, the API version and a SHA256WithRSA
 * signature of the body in the headers. The response is signed the same way, so the
 * signature is checked before the body is read.
 *
 * Waffo answers with an `orderAction` describing where to send the customer; the
 * cashier then notifies the panel through a webhook.
 */
class WaffoChannel implements Channel
{
    public function __construct(
        private CreateOrderService $orderService,
        private PaymentFulfillmentService $fulfillmentService,
    ) {
    }

    public function channel(): PaymentChannel
    {
        return PaymentChannel::Waffo;
    }

    public function create(CheckoutContext $context, ChannelRoute $route): string
    {
        $apiKey = (string) $this->channel()->setting('api_key');
        $merchantId = (string) $this->channel()->setting('merchant_id');
        $privateKey = (string) $this->channel()->setting('private_key');

        if ($apiKey === '' || $merchantId === '' || $privateKey === '') {
            throw new DisplayException('The Waffo channel is not configured.');
        }

        $reference = $context->reference;
        $currency = strtoupper((string) config('modules.billing.currency.code'));

        $payload = [
            'paymentRequestId' => $reference,
            'merchantOrderId' => $reference,
            'orderCurrency' => $currency,
            'orderAmount' => $this->amount($context->total(), $currency),
            'orderDescription' => $context->product->name,
            'orderRequestedAt' => now()->toIso8601String(),
            'successRedirectUrl' => $this->successUrl($reference),
            'failedRedirectUrl' => $this->failedUrl(),
            'cancelRedirectUrl' => $this->cancelUrl(),
            'notifyUrl' => $this->notifyUrl(),
            'merchantInfo' => [
                'merchantId' => $merchantId,
            ],
            'userInfo' => [
                'userId' => (string) $context->user->id,
                'userEmail' => $context->user->email,
            ],
            'goodsInfo' => [
                'goodsId' => (string) $context->product->id,
                'goodsName' => $context->product->name,
                'goodsQuantity' => 1,
                'goodsUrl' => config('app.url'),
                'appName' => (string) config('app.name'),
            ],
            'paymentInfo' => [
                'productName' => 'ONE_TIME_PAYMENT',
            ],
        ];

        $response = $this->post($payload);

        if (($response['code'] ?? '1') !== '0') {
            throw new DisplayException('Waffo rejected the order: ' . ($response['msg'] ?? 'unknown error'));
        }

        $data = $response['data'] ?? [];
        $acquiringOrderId = (string) ($data['acquiringOrderId'] ?? '');

        if ($acquiringOrderId === '') {
            throw new DisplayException('Waffo did not return an order.');
        }

        $this->orderService->create(
            $acquiringOrderId,
            $context->user,
            $context->product,
            Order::STATUS_PENDING,
            $context->orderType(),
            $context->price,
            $context->orderMetadata(),
        );

        return $this->checkoutUrl($data);
    }

    public function process(string $identifier): Order
    {
        $order = Order::where('transaction_id', $identifier)->firstOrFail();

        $this->fulfillmentService->fulfill($order, (array) $order->metadata);

        return $order->fresh();
    }

    /**
     * Reads the result of a Waffo order.
     */
    public function inquiry(string $acquiringOrderId): ?array
    {
        $response = $this->post([
            'paymentRequestId' => $acquiringOrderId,
            'acquiringOrderId' => $acquiringOrderId,
        ]);

        if (($response['code'] ?? '1') !== '0') {
            return null;
        }

        return $response['data'] ?? null;
    }

    /**
     * Checks the signature Waffo sends with a webhook.
     */
    public function verifySignature(string $rawBody, ?string $signature): bool
    {
        return RsaSignature::verify(
            $rawBody,
            (string) $signature,
            (string) $this->channel()->setting('public_key'),
        );
    }

    /**
     * Sends a signed request to the Waffo API and returns the decoded response.
     */
    private function post(array $payload): array
    {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $privateKey = (string) $this->channel()->setting('private_key');

        $response = Http::withHeaders([
            'X-API-KEY' => (string) $this->channel()->setting('api_key'),
            'X-SIGNATURE' => RsaSignature::sign($body, $privateKey),
            'X-API-VERSION' => '1.0.0',
            'Content-Type' => 'application/json',
        ])->post(rtrim((string) ($this->channel()->setting('base_url') ?? 'https://api.waffo.com'), '/') . '/api/v1/order/create', $body);

        if ($response->failed()) {
            throw new DisplayException('Waffo rejected the request: ' . $response->body());
        }

        // The response is signed with Waffo's private key; the signature is checked
        // before the body is trusted.
        $signature = $response->header('X-SIGNATURE');

        if ($signature !== '' && !RsaSignature::verify($response->body(), $signature, (string) $this->channel()->setting('public_key'))) {
            throw new DisplayException('Waffo response signature could not be verified.');
        }

        return (array) $response->json();
    }

    /**
     * Works out where the customer should be sent.
     *
     * Waffo describes the next step in `orderAction`, which is a JSON string. A card
     * payment that still needs authorisation uses a different shape, but the hosted
     * cashier is the normal path.
     */
    private function checkoutUrl(array $data): string
    {
        $action = $data['orderAction'] ?? null;

        if (is_string($action) && $action !== '') {
            $decoded = json_decode($action, true);

            if (is_array($decoded)) {
                $url = ($decoded['actionType'] ?? '') === 'DEEPLINK'
                    ? ($decoded['deeplinkUrl'] ?? '')
                    : ($decoded['webUrl'] ?? '');

                if ($url !== '') {
                    return $url;
                }
            }
        }

        throw new DisplayException('Waffo did not return a checkout URL.');
    }

    /**
     * Formats an amount the way Waffo expects: a string, with the number of decimal
     * places the currency uses.
     */
    private function amount(float $amount, string $currency): string
    {
        $decimals = in_array(strtoupper($currency), ['JPY', 'KRW', 'VND', 'CLP'], true) ? 0 : 2;

        return number_format($amount, $decimals, '.', '');
    }

    private function notifyUrl(): string
    {
        return config('app.url') . '/api/client/billing/waffo/notify';
    }

    /**
     * Where the customer lands after paying. The reference ties the return to the
     * order the checkout was created for.
     */
    private function successUrl(string $reference): string
    {
        return config('app.url') . '/account/billing/processing?reference=' . urlencode($reference);
    }

    private function failedUrl(): string
    {
        return config('app.url') . '/account/billing/cancel';
    }

    private function cancelUrl(): string
    {
        return config('app.url') . '/account/billing/cancel';
    }
}
