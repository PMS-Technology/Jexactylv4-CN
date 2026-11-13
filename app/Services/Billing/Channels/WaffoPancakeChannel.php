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
 * Pancake, Waffo's crypto Merchant of Record.
 *
 * It is the same acquiring API as Waffo — same endpoints, same RSA signatures — but
 * the order asks for a stablecoin payment method, and the shopper pays in crypto
 * rather than through a bank or card.
 */
class WaffoPancakeChannel implements Channel
{
    public function __construct(
        private CreateOrderService $orderService,
        private PaymentFulfillmentService $fulfillmentService,
    ) {
    }

    public function channel(): PaymentChannel
    {
        return PaymentChannel::WaffoPancake;
    }

    public function create(CheckoutContext $context, ChannelRoute $route): string
    {
        $apiKey = (string) $this->channel()->setting('api_key');
        $merchantId = (string) $this->channel()->setting('merchant_id');
        $privateKey = (string) $this->channel()->setting('private_key');

        if ($apiKey === '' || $merchantId === '' || $privateKey === '') {
            throw new DisplayException('The Pancake channel is not configured.');
        }

        $reference = $context->reference;
        $currency = strtoupper((string) ($this->channel()->setting('currency') ?? 'USDC'));

        $payload = [
            'paymentRequestId' => $reference,
            'merchantOrderId' => $reference,
            'orderCurrency' => $currency,
            'orderAmount' => number_format($context->total(), 2, '.', ''),
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
                'payMethodType' => 'CRYPTO',
                'payMethodName' => $currency,
            ],
        ];

        $response = $this->post($payload);

        if (($response['code'] ?? '1') !== '0') {
            throw new DisplayException('Pancake rejected the order: ' . ($response['msg'] ?? 'unknown error'));
        }

        $data = $response['data'] ?? [];
        $acquiringOrderId = (string) ($data['acquiringOrderId'] ?? '');

        if ($acquiringOrderId === '') {
            throw new DisplayException('Pancake did not return an order.');
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
     * Checks the signature Pancake sends with a webhook.
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
     * Sends a signed request to the Pancake API and returns the decoded response.
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
            throw new DisplayException('Pancake rejected the request: ' . $response->body());
        }

        $signature = $response->header('X-SIGNATURE');

        if ($signature !== '' && !RsaSignature::verify($response->body(), $signature, (string) $this->channel()->setting('public_key'))) {
            throw new DisplayException('Pancake response signature could not be verified.');
        }

        return (array) $response->json();
    }

    /**
     * Works out where the customer should be sent.
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

        throw new DisplayException('Pancake did not return a checkout URL.');
    }

    private function notifyUrl(): string
    {
        return config('app.url') . '/api/client/billing/pancake/notify';
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
