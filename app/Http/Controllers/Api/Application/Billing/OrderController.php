<?php

namespace Everest\Http\Controllers\Api\Application\Billing;

use Everest\Facades\Activity;
use Everest\Models\Billing\Order;
use Spatie\QueryBuilder\QueryBuilder;
use Spatie\QueryBuilder\AllowedFilter;
use Everest\Services\Billing\OrderManagementService;
use Everest\Transformers\Api\Application\OrderTransformer;
use Everest\Exceptions\Http\QueryValueOutOfRangeHttpException;
use Everest\Http\Controllers\Api\Application\ApplicationApiController;
use Everest\Http\Requests\Api\Application\Billing\Orders\GetBillingOrdersRequest;
use Everest\Http\Requests\Api\Application\Billing\Orders\UpdateBillingOrderRequest;

class OrderController extends ApplicationApiController
{
    public function __construct(private OrderManagementService $orderManagement)
    {
        parent::__construct();
    }

    /**
     * Get all orders.
     */
    public function index(GetBillingOrdersRequest $request): array
    {
        $perPage = (int) $request->query('per_page', '20');
        if ($perPage < 1 || $perPage > 100) {
            throw new QueryValueOutOfRangeHttpException('per_page', 1, 100);
        }

        $orders = QueryBuilder::for(Order::query())
            // The customer is shown with the order, so it is loaded with the list rather
            // than one query per order.
            ->with('user')
            // server_id lets the admin server page list that server's orders. Order names are
            // random UUIDs, so the legacy filter on name (the server UUID prefix) never matched.
            ->allowedFilters(...['id', 'name', 'description', AllowedFilter::exact('server_id')])
            ->allowedSorts(...['id', 'name', 'total', 'is_renewal', 'created_at', 'threat_index'])
            ->paginate($perPage);

        return $this->transform($orders, OrderTransformer::class);
    }

    /**
     * Get a single order.
     */
    public function view(GetBillingOrdersRequest $request, Order $order): array
    {
        return $this->transform($order, OrderTransformer::class);
    }

    /**
     * Act on an order by hand.
     *
     * The gateways tell the panel when a payment settles, so this is for the orders
     * they never told it about.
     */
    public function update(UpdateBillingOrderRequest $request, Order $order): array
    {
        $action = (string) $request->input('action');

        $order = $action === 'cancel'
            ? $this->orderManagement->cancel($order)
            : $this->orderManagement->markAsPaid($order);

        Activity::event('admin:billing:order:' . $action)
            ->subject($order)
            ->property('order', $order)
            ->description('A billing order was ' . ($action === 'cancel' ? 'cancelled' : 'marked as paid') . ' by an administrator')
            ->log();

        return $this->transform($order, OrderTransformer::class);
    }
}
