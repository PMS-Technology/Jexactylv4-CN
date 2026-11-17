<?php

namespace Everest\Tests\Integration\Console\Commands\Billing;

use Carbon\Carbon;
use Everest\Models\Billing\Order;
use Everest\Tests\Traits\Integration\CreatesBillingTestModels;
use Everest\Tests\Integration\Api\Client\ClientApiIntegrationTestCase;

class CleanupOrdersCommandTest extends ClientApiIntegrationTestCase
{
    use CreatesBillingTestModels;

    public function setUp(): void
    {
        parent::setUp();

        $this->enableBilling();

        config(['modules.billing.orders.expire_days' => 7]);
    }

    protected function tearDown(): void
    {
        $this->cleanupBillingModels();

        parent::tearDown();
    }

    public function testItLeavesAnOrderThatIsStillWithinThePaymentWindowAlone(): void
    {
        // A customer who is still on the gateway page keeps their order, no matter how
        // long the payment takes.
        $order = $this->makeOrder(['status' => Order::STATUS_PENDING]);
        $this->age($order, now()->subHours(1));

        $this->artisan('p:billing:cleanup-orders')->assertExitCode(0);

        $this->assertSame(Order::STATUS_PENDING, $order->fresh()->status);
    }

    public function testItExpiresAnOrderThatHasBeenWaitingUnpaidForLongerThanTheWindow(): void
    {
        $order = $this->makeOrder(['status' => Order::STATUS_PENDING]);
        $this->age($order, now()->subDays(8));

        $this->artisan('p:billing:cleanup-orders')->assertExitCode(0);

        $this->assertSame(Order::STATUS_EXPIRED, $order->fresh()->status);
    }

    public function testItRemovesExpiredOrders(): void
    {
        $order = $this->makeOrder(['status' => Order::STATUS_EXPIRED]);

        $this->artisan('p:billing:cleanup-orders')->assertExitCode(0);

        $this->assertNull(Order::find($order->id));
    }

    public function testItLeavesOrdersThatWereAlreadySettledAlone(): void
    {
        $processed = $this->makeOrder(['status' => Order::STATUS_PROCESSED]);
        $failed = $this->makeOrder(['status' => Order::STATUS_FAILED]);
        $this->age($processed, now()->subDays(30));
        $this->age($failed, now()->subDays(30));

        $this->artisan('p:billing:cleanup-orders')->assertExitCode(0);

        $this->assertSame(Order::STATUS_PROCESSED, $processed->fresh()->status);
        $this->assertSame(Order::STATUS_FAILED, $failed->fresh()->status);
    }

    public function testTheWindowIsConfigurable(): void
    {
        config(['modules.billing.orders.expire_days' => 1]);

        $order = $this->makeOrder(['status' => Order::STATUS_PENDING]);
        $this->age($order, now()->subDays(2));

        $this->artisan('p:billing:cleanup-orders')->assertExitCode(0);

        $this->assertSame(Order::STATUS_EXPIRED, $order->fresh()->status);
    }

    /**
     * Backdates an order, so the cleanup task sees it as an order of that age.
     */
    private function age(Order $order, Carbon $createdAt): void
    {
        $order->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt])->save();
    }
}
