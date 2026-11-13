<?php

namespace Everest\Services\Billing;

use Everest\Models\User;
use Everest\Models\Server;
use Everest\Models\Billing\Order;
use Illuminate\Support\Facades\DB;
use Everest\Models\Billing\Product;
use Everest\Exceptions\DisplayException;
use Everest\Models\Billing\DiscountCode;
use Everest\Models\Billing\BillingException;

/**
 * Turns a confirmed payment into a deployed server, a renewal or an upgrade.
 *
 * Every gateway funnels through here once it knows the money arrived, so the
 * fulfilment rules (claiming the order atomically, consuming the discount code,
 * checking the amount, and recording failures) live in one place rather than being
 * copied per gateway.
 */
class PaymentFulfillmentService
{
    public function __construct(
        private UpgradeService $upgradeService,
        private ServerRenewalService $renewalService,
        private ServerDeploymentService $deploymentService,
    ) {
    }

    /**
     * Claims the pending order and carries out the work it paid for.
     *
     * @param array<string, mixed> $metadata the order metadata the gateway echoed back
     * @param float|null $paidAmount the amount the gateway reported, when it reports one
     * @param string|null $paidCurrency the currency the gateway reported
     */
    public function fulfill(Order $order, array $metadata, ?float $paidAmount = null, ?string $paidCurrency = null): ?Server
    {
        // Atomically claim the order before doing any deployment work.
        $claimed = DB::transaction(function () use ($order, $metadata) {
            $claimed = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($claimed->status !== Order::STATUS_PENDING) {
                throw new DisplayException('This order has already been processed.');
            }

            $claimed->setStatus(Order::STATUS_PROCESSING);

            if (!empty($metadata['discount_code'])) {
                $discount_code = DiscountCode::where('code', $metadata['discount_code'])->lockForUpdate()->first();

                if ($discount_code && $discount_code->isValid()) {
                    $discount_code->use();
                }
            }

            return $claimed;
        });

        // Bind the completed payment to the order.
        $this->assertAmountMatches($claimed, $paidAmount, $paidCurrency);

        $server = null;

        try {
            switch ($claimed->type) {
                case Order::TYPE_RENEWAL:
                    $server = $this->renewalService->handle(Server::find($metadata['server_id'] ?? null));
                    break;
                case Order::TYPE_NEW:
                    $user = User::findOrFail($metadata['user_id']);
                    $product = Product::findOrFail($metadata['product_id']);
                    $server = $this->deploymentService->handle($user, $product, $metadata, $claimed);
                    $claimed->assignServer($server);
                    break;
                case Order::TYPE_UPGRADE:
                    $server = $this->upgradeService->handle(Server::find($metadata['server_id'] ?? null), Product::findOrFail($metadata['product_id']));
                    break;
                default:
                    break;
            }

            $claimed->setStatus(Order::STATUS_PROCESSED);
        } catch (DisplayException $exception) {
            $claimed->setStatus(Order::STATUS_FAILED);

            BillingException::create([
                'order_id' => $claimed->id,
                'exception_type' => BillingException::TYPE_DEPLOYMENT,
                'title' => 'Deployment or renewal of server failed',
                'description' => $exception->getMessage(),
            ]);

            throw $exception;
        }

        return $server;
    }

    /**
     * Checks the amount the gateway reported against the order.
     *
     * A gateway that does not report an amount (Epay's callback, for instance) is
     * trusted, since the signature already proved the notification came from it.
     */
    private function assertAmountMatches(Order $order, ?float $paidAmount, ?string $paidCurrency): void
    {
        if ($paidAmount === null) {
            return;
        }

        $expected = round($order->total, 2);
        $currency = strtolower((string) ($order->metadata['currency'] ?? config('modules.billing.currency.code')));

        if (($paidCurrency !== null && strtolower($paidCurrency) !== $currency) || round($paidAmount, 2) + 0.001 < $expected - 0.001) {
            // Release the claim rather than failing the order outright.
            $order->setStatus(Order::STATUS_PENDING);

            throw new DisplayException('Payment amount or currency does not match the order.');
        }
    }
}
