<?php

namespace Everest\Http\Controllers\Api\Client\Billing;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Everest\Models\Billing\Order;
use Everest\Exceptions\DisplayException;
use Everest\Services\Billing\PaymentFulfillmentService;
use Everest\Services\Billing\Channels\WaffoPancakeChannel;

/**
 * The Pancake payment notification.
 *
 * The same shape as the Waffo notification — Pancake is Waffo's crypto product — but
 * signed with the Pancake keys and settled in the configured stablecoin.
 */
class PancakeNotificationController
{
    public function __construct(
        private WaffoPancakeChannel $channel,
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

        if (!is_array($result) || ($result['orderStatus'] ?? '') !== 'PAY_SUCCESS') {
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
            return response('failed', 200);
        }

        return response('success', 200);
    }

    private function paidAmount(array $result): ?float
    {
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
