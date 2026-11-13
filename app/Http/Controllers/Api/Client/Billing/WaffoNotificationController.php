<?php

namespace Everest\Http\Controllers\Api\Client\Billing;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Everest\Models\Billing\Order;
use Everest\Exceptions\DisplayException;
use Everest\Services\Billing\Channels\WaffoChannel;
use Everest\Services\Billing\PaymentFulfillmentService;

/**
 * The Waffo payment notification.
 *
 * Waffo signs the request body with its private key, so the signature is checked
 * against the raw body before the event is looked at.
 */
class WaffoNotificationController
{
    public function __construct(
        private WaffoChannel $channel,
        private PaymentFulfillmentService $fulfillmentService,
    ) {
    }

    public function __invoke(Request $request): Response
    {
        $rawBody = $request->getContent();

        if (!$this->channel->verifySignature($rawBody, $request->header('X-SIGNATURE'))) {
            return response('invalid signature', 401);
        }

        $event = json_decode($rawBody, true);

        if (!is_array($event)) {
            return response('invalid payload', 400);
        }

        if (($event['eventType'] ?? '') !== 'PAYMENT_NOTIFICATION') {
            return response('ok', 200);
        }

        $result = $event['result'] ?? [];

        if (!is_array($result)) {
            return response('ok', 200);
        }

        // The order only counts as paid once Waffo says so.
        if (($result['orderStatus'] ?? '') !== 'PAY_SUCCESS') {
            return response('ok', 200);
        }

        $reference = (string) ($result['merchantOrderId'] ?? '');

        $order = $reference !== ''
            ? Order::where('metadata->payment_request_id', $reference)->first()
            : null;

        if (!$order) {
            $acquiringOrderId = (string) ($result['acquiringOrderId'] ?? '');
            $order = $acquiringOrderId !== '' ? Order::where('transaction_id', $acquiringOrderId)->first() : null;
        }

        if (!$order) {
            return response('ok', 200);
        }

        if ($order->status === Order::STATUS_PROCESSED) {
            // Waffo retries a notification that is not answered, so a processed order is
            // already dealt with.
            return response('ok', 200);
        }

        try {
            $this->fulfillmentService->fulfill(
                $order,
                (array) $order->metadata,
                $this->paidAmount($result),
                $this->paidCurrency($result),
            );
        } catch (DisplayException $exception) {
            // Waffo retries on a failed response, which is what we want: the payment is
            // real but the server could not be deployed yet.
            return response('failed', 200);
        }

        return response('success', 200);
    }

    /**
     * The amount Waffo says was paid.
     */
    private function paidAmount(array $result): ?float
    {
        // `finalDealAmount` is what the customer actually paid; `orderAmount` is what the
        // merchant asked for. They differ when the customer pays in another currency.
        $amount = $result['finalDealAmount'] ?? $result['orderAmount'] ?? null;

        if ($amount === null || $amount === '') {
            return null;
        }

        return (float) $amount;
    }

    private function paidCurrency(array $result): ?string
    {
        $currency = $result['orderCurrency'] ?? null;

        return $currency === null || $currency === '' ? null : (string) $currency;
    }
}
