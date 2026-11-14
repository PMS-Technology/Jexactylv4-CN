<?php

namespace Everest\Services\Billing\Channels;

use Everest\Models\Billing\Order;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Everest\Exceptions\DisplayException;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Services\Billing\CheckoutContext;
use Everest\Services\Billing\CreateOrderService;
use Everest\Services\Billing\PaymentFulfillmentService;

/**
 * Creem, a Merchant of Record for digital goods.
 *
 * Creem sells products that already exist in its dashboard, so a panel product has to
 * point at the Creem product id (`external_id`). Creem charges the customer itself and
 * then tells the panel through a webhook that the checkout completed.
 */
class CreemChannel implements Channel
{
    public function __construct(
        private CreateOrderService $orderService,
        private PaymentFulfillmentService $fulfillmentService,
    ) {
    }

    public function channel(): PaymentChannel
    {
        return PaymentChannel::Creem;
    }

    public function create(CheckoutContext $context, ChannelRoute $route): CheckoutTarget
    {
        $apiKey = (string) $this->channel()->setting('api_key');

        if ($apiKey === '') {
            throw new DisplayException('The Creem channel is not configured.');
        }

        $externalId = $context->product->external_id;

        if (!$externalId) {
            throw new DisplayException('This product is not linked to a Creem product yet.');
        }

        $response = Http::withHeaders([
            'x-api-key' => $apiKey,
            'Content-Type' => 'application/json',
        ])->post(rtrim((string) ($this->channel()->setting('base_url') ?? 'https://api.creem.io'), '/') . '/v1/checkouts', [
            'product_id' => $externalId,
            'success_url' => $this->successUrl($context->reference),
            'request_id' => $context->reference,
            'units' => 1,
            'custom_price' => (int) round($context->total() * 100),
            'customer' => [
                'email' => $context->user->email,
                'name' => $context->user->username,
            ],
            'metadata' => [
                'order_reference' => $context->reference,
                'user_id' => (string) $context->user->id,
                'product_id' => (string) $context->product->id,
                'server_id' => (string) ($context->metadata['server_id'] ?? ''),
                'node_id' => (string) ($context->metadata['node_id'] ?? ''),
                'egg_id' => (string) ($context->metadata['egg_id'] ?? ''),
                'variables' => $context->metadata['variables'] ?? '{}',
                'order_type' => $context->orderType(),
                'discount_code' => (string) ($context->metadata['discount_code'] ?? ''),
            ],
        ]);

        if ($response->failed()) {
            throw new DisplayException('Creem rejected the checkout: ' . $this->errorMessage($response));
        }

        $checkoutId = (string) $response->json('id');

        if ($checkoutId === '') {
            throw new DisplayException('Creem did not return a checkout session.');
        }

        $this->orderService->create(
            $checkoutId,
            $context->user,
            $context->product,
            Order::STATUS_PENDING,
            $context->orderType(),
            $context->price,
            $context->orderMetadata(),
        );

        return new CheckoutTarget((string) $response->json('checkout_url'));
    }

    public function process(string $identifier): Order
    {
        $order = Order::where('transaction_id', $identifier)->firstOrFail();

        $this->fulfillmentService->fulfill($order, (array) $order->metadata);

        return $order->fresh();
    }

    /**
     * Reads the details of a completed checkout from Creem.
     *
     * The webhook carries everything needed, but the customer is redirected back to the
     * panel before the webhook always arrives, so the panel asks Creem directly when
     * the customer comes back.
     */
    public function checkout(string $identifier): ?array
    {
        $apiKey = (string) $this->channel()->setting('api_key');

        if ($apiKey === '' || $identifier === '') {
            return null;
        }

        $response = Http::withHeaders(['x-api-key' => $apiKey])
            ->get(rtrim((string) ($this->channel()->setting('base_url') ?? 'https://api.creem.io'), '/') . '/v1/checkouts/' . $identifier);

        if ($response->failed()) {
            return null;
        }

        return $response->json();
    }

    /**
     * Checks the signature Creem sends with a webhook.
     *
     * The signature is an HMAC-SHA256 of the raw request body, so the body has to be
     * read before it is parsed.
     */
    public function verifySignature(string $rawBody, ?string $signature): bool
    {
        $secret = (string) $this->channel()->setting('webhook_secret');

        if ($secret === '' || !$signature) {
            return false;
        }

        $expected = hash_hmac('sha256', $rawBody, $secret);

        return hash_equals($expected, $signature);
    }

    /**
     * Where the customer lands after paying. The reference ties the return to the
     * order the checkout was created for.
     */
    private function successUrl(string $reference): string
    {
        return config('app.url') . '/account/billing/processing?reference=' . urlencode($reference);
    }

    /**
     * The message Creem sent with the failure, if it sent one.
     *
     * The error body is a list of issues rather than a single message, so it is read
     * carefully rather than cast.
     */
    private function errorMessage(Response $response): string
    {
        $body = $response->json();

        if (is_string($body)) {
            return $body;
        }

        $message = $response->json('message');

        if (is_string($message)) {
            return $message;
        }

        if (is_array($message)) {
            return implode(' ', array_map(fn ($issue) => is_string($issue) ? $issue : json_encode($issue), $message));
        }

        return 'unknown error';
    }
}
