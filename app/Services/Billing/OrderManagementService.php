<?php

namespace Everest\Services\Billing;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Billing\Order;
use Everest\Models\Billing\Product;
use Everest\Exceptions\DisplayException;

/**
 * What an administrator can do to an order by hand.
 *
 * The gateways tell the panel when a payment settles, so an order is normally paid
 * without anyone touching it. Sometimes that does not happen — the gateway never calls
 * back, or the customer paid in a way the panel cannot see — and the order has to be
 * settled from the admin interface instead.
 */
class OrderManagementService
{
    public function __construct(private PaymentFulfillmentService $fulfillmentService)
    {
    }

    /**
     * Marks an order as paid and carries out what it paid for.
     *
     * The order goes through the same fulfilment as a gateway notification would, so
     * the server is deployed, renewed or upgraded for real. Only the payment
     * confirmation itself is skipped: the administrator is the one saying the money
     * arrived.
     */
    public function markAsPaid(Order $order): Order
    {
        if ($order->status !== Order::STATUS_PENDING) {
            throw new DisplayException('Only a pending order can be marked as paid.');
        }

        $metadata = $this->metadataFor($order);

        $this->assertCanBeFulfilled($order, $metadata);

        $this->fulfillmentService->fulfill($order, $metadata);

        return $order->fresh();
    }

    /**
     * Cancels an order.
     *
     * A cancelled order is marked expired, so the cleanup task removes it. The order is
     * not deleted here, because the record of what happened is worth keeping until
     * then.
     */
    public function cancel(Order $order): Order
    {
        if ($order->status !== Order::STATUS_PENDING) {
            throw new DisplayException('Only a pending order can be cancelled.');
        }

        $order->setStatus(Order::STATUS_EXPIRED);

        return $order->fresh();
    }

    /**
     * What the order was for, in the shape the fulfilment expects.
     *
     * The order row is the source of truth about who bought what; the metadata is a
     * copy made at checkout time and can be missing on an older order. The two are
     * reconciled here, so a settled order always knows who it is for.
     *
     * @return array<string, mixed>
     */
    private function metadataFor(Order $order): array
    {
        $metadata = (array) $order->metadata;

        $metadata['user_id'] = (string) $order->user_id;
        $metadata['product_id'] = (string) $order->product_id;
        // The deployment reads these without checking whether they are there, so they
        // are filled in for an order whose metadata was never completed.
        $metadata['variables'] = $metadata['variables'] ?? json_encode([]);
        $metadata['node_id'] = (string) ($metadata['node_id'] ?? '');
        $metadata['egg_id'] = (string) ($metadata['egg_id'] ?? '');

        return $metadata;
    }

    /**
     * Checks that the order still has everything the fulfilment needs.
     *
     * If the server it renews was deleted in the meantime, or the product it buys is
     * gone, there is nothing to fulfil and the administrator has to be told rather
     * than the panel failing halfway through.
     *
     * @param array<string, mixed> $metadata
     */
    private function assertCanBeFulfilled(Order $order, array $metadata): void
    {
        if (!User::where('id', $order->user_id)->exists()) {
            throw new DisplayException('The customer of this order no longer exists.');
        }

        if (!Product::where('id', $order->product_id)->exists()) {
            throw new DisplayException('The product this order is about no longer exists.');
        }

        if ($order->type === Order::TYPE_NEW) {
            return;
        }

        $serverId = $metadata['server_id'] ?? null;

        if (empty($serverId) || !Server::where('id', $serverId)->exists()) {
            throw new DisplayException('The server this order is about no longer exists.');
        }
    }
}
