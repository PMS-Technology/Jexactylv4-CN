<?php

namespace Everest\Http\Controllers\Api\Client\Billing;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Everest\Models\Billing\Order;
use Everest\Exceptions\DisplayException;
use Everest\Services\Billing\Channels\EpayChannel;
use Everest\Services\Billing\PaymentFulfillmentService;

/**
 * The Epay payment notification.
 *
 * Epay calls this once the payment settles. The signature is checked first: without it
 * there is nothing to trust, since the request comes from the internet and carries the
 * order details.
 */
class EpayNotificationController
{
    public function __construct(
        private EpayChannel $channel,
        private PaymentFulfillmentService $fulfillmentService,
    ) {
    }

    public function __invoke(Request $request): Response
    {
        $params = $request->all();

        if (!$this->channel->verify($params)) {
            // Epay expects the plain word it can read; anything else is treated as a
            // failure and the notification is retried.
            return response('fail', 200);
        }

        if (($params['trade_status'] ?? '') !== 'TRADE_SUCCESS') {
            return response('success', 200);
        }

        $reference = (string) ($params['out_trade_no'] ?? '');

        $order = Order::where('transaction_id', $reference)->first();

        if (!$order) {
            return response('fail', 200);
        }

        if ($order->status === Order::STATUS_PROCESSED) {
            // The notification is retried by some Epay builds; a processed order is
            // already fulfilled.
            return response('success', 200);
        }

        try {
            $this->fulfillmentService->fulfill($order, (array) $order->metadata);
        } catch (DisplayException $exception) {
            return response('fail', 200);
        }

        return response('success', 200);
    }
}
