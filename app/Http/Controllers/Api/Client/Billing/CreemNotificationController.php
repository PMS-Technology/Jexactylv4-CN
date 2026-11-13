<?php

namespace Everest\Http\Controllers\Api\Client\Billing;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Everest\Models\Billing\Order;
use Everest\Exceptions\DisplayException;
use Everest\Services\Billing\Channels\CreemChannel;
use Everest\Services\Billing\PaymentFulfillmentService;

/**
 * The Creem payment notification.
 *
 * Creem signs the request body with the webhook secret, so the signature is checked
 * against the raw body before the event is looked at.
 */
class CreemNotificationController
{
    public function __construct(
        private CreemChannel $channel,
        private PaymentFulfillmentService $fulfillmentService,
    ) {
    }

    public function __invoke(Request $request): Response
    {
        $rawBody = $request->getContent();

        if (!$this->channel->verifySignature($rawBody, $request->header('creem-signature'))) {
            return response('invalid signature', 401);
        }

        $event = json_decode($rawBody, true);

        if (!is_array($event)) {
            return response('invalid payload', 400);
        }

        if (($event['eventType'] ?? '') !== 'checkout.completed') {
            // Other events are not about a purchase settling.
            return response('ok', 200);
        }

        $reference = (string) ($event['object']['metadata']['order_reference'] ?? '');

        $order = $reference !== ''
            ? Order::where('metadata->payment_request_id', $reference)->first()
            : null;

        if (!$order) {
            $checkoutId = (string) ($event['object']['id'] ?? '');
            $order = $checkoutId !== '' ? Order::where('transaction_id', $checkoutId)->first() : null;
        }

        if (!$order) {
            return response('ok', 200);
        }

        if ($order->status === Order::STATUS_PROCESSED) {
            // Creem retries a delivery that is not answered in time, so a processed
            // order is already dealt with.
            return response('ok', 200);
        }

        try {
            $this->fulfillmentService->fulfill(
                $order,
                (array) $order->metadata,
                $this->paidAmount($event),
                $this->paidCurrency($event),
            );
        } catch (DisplayException $exception) {
            // Creem retries on a non-2xx, which is what we want: the payment is real but
            // the server could not be deployed yet.
            return response('order processing failed', 500);
        }

        return response('ok', 200);
    }

    /**
     * The amount Creem says was paid, in the currency of the order.
     */
    private function paidAmount(array $event): ?float
    {
        $order = $event['object']['order'] ?? null;

        if (!is_array($order) || !isset($order['amount_due'])) {
            return null;
        }

        return ((float) $order['amount_due']) / 100;
    }

    private function paidCurrency(array $event): ?string
    {
        $order = $event['object']['order'] ?? null;

        if (!is_array($order) || !isset($order['currency'])) {
            return null;
        }

        return (string) $order['currency'];
    }
}
