<?php

namespace Everest\Http\Controllers\Api\Client\Billing;

use Everest\Models\Billing\Order;
use Everest\Exceptions\DisplayException;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Services\Billing\CheckoutService;
use Everest\Services\Billing\Channels\ChannelManager;
use Everest\Transformers\Api\Client\ServerTransformer;
use Everest\Http\Controllers\Api\Client\ClientApiController;
use Everest\Http\Requests\Api\Client\Billing\CreateCheckoutRequest;
use Everest\Http\Requests\Api\Client\Billing\ProcessCheckoutRequest;

class CheckoutController extends ClientApiController
{
    public function __construct(
        private CheckoutService $checkoutService,
        private ChannelManager $channels,
    ) {
        parent::__construct();
    }

    /**
     * Starts a checkout through the payment method the customer picked.
     *
     * Returns the URL of the hosted payment page; the client sends the customer there.
     */
    public function create(CreateCheckoutRequest $request): string
    {
        return $this->checkoutService->create(
            $request->user(),
            $request->all(),
            (string) $request->input('payment_method'),
        );
    }

    /**
     * Confirms a payment once the customer comes back from the gateway.
     *
     * The customer returning only says they made it back; the order is only fulfilled
     * once the gateway confirms the payment. Stripe can be asked directly, so the
     * server comes back right away. The other channels notify the panel over HTTP, so
     * their order is either already processed or still waiting for the notification.
     */
    public function process(ProcessCheckoutRequest $request): array
    {
        $order = $this->findOrder($request);

        if (!$order) {
            throw new DisplayException('This order could not be found.');
        }

        if ($order->status === Order::STATUS_PROCESSED) {
            return $this->transform($order->server, ServerTransformer::class);
        }

        if ($order->status === Order::STATUS_FAILED) {
            throw new DisplayException('This order could not be completed.');
        }

        // Stripe keeps the payment details behind a session the panel can look up, so
        // the order can be finished straight away.
        if ($request->filled('session')) {
            $order = $this->channels->channel($this->channelFor($order))->process((string) $request->input('session'));

            return $this->transform($order->server, ServerTransformer::class);
        }

        // The payment notification has not arrived yet. The client polls this endpoint
        // until the order is processed.
        return ['status' => 'pending'];
    }

    /**
     * The channel the order was paid through.
     *
     * The order records it, because several channels can be in use at the same time and
     * the customer may have paid through any of them.
     */
    private function channelFor(Order $order): PaymentChannel
    {
        $channel = PaymentChannel::tryFrom((string) ($order->metadata['payment_channel'] ?? ''));

        // An order from before the payment methods existed has no channel recorded, so
        // it was paid through Stripe.
        return $channel ?? PaymentChannel::Stripe;
    }

    /**
     * Finds the order the customer is coming back from.
     */
    private function findOrder(ProcessCheckoutRequest $request): ?Order
    {
        if ($request->filled('session')) {
            return Order::where('transaction_id', (string) $request->input('session'))->first();
        }

        if ($request->filled('reference')) {
            $reference = (string) $request->input('reference');

            return Order::where('metadata->payment_request_id', $reference)->first()
                ?? Order::where('transaction_id', $reference)->first();
        }

        return null;
    }
}
