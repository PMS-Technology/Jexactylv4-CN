<?php

namespace Everest\Tests\Integration\Api\Application\Billing;

use Illuminate\Http\Response;
use Everest\Models\Billing\Order;
use Everest\Tests\Traits\Integration\CreatesBillingTestModels;
use Everest\Tests\Integration\Api\Application\ApplicationApiIntegrationTestCase;

class OrderControllerTest extends ApplicationApiIntegrationTestCase
{
    use CreatesBillingTestModels;

    public function setUp(): void
    {
        parent::setUp();

        $this->enableBilling();
    }

    public function testItReturnsASingleOrder(): void
    {
        $order = $this->makeOrder(['status' => Order::STATUS_PENDING]);

        $response = $this->getJson('/api/application/billing/orders/' . $order->id);

        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonPath('object', 'order');
        $response->assertJsonPath('attributes.id', $order->id);
        $response->assertJsonPath('attributes.status', Order::STATUS_PENDING);
    }

    public function testItCancelsAPendingOrder(): void
    {
        $order = $this->makeOrder(['status' => Order::STATUS_PENDING]);

        $response = $this->patchJson('/api/application/billing/orders/' . $order->id, ['action' => 'cancel']);

        $response->assertStatus(Response::HTTP_OK);
        $response->assertJsonPath('attributes.status', Order::STATUS_EXPIRED);
        $this->assertSame(Order::STATUS_EXPIRED, $order->fresh()->status);
    }

    public function testItRefusesToActOnAnOrderThatIsNotPending(): void
    {
        $order = $this->makeOrder(['status' => Order::STATUS_PROCESSED]);

        $response = $this->patchJson('/api/application/billing/orders/' . $order->id, ['action' => 'cancel']);

        $response->assertStatus(Response::HTTP_BAD_REQUEST);
        $response->assertJsonPath('errors.0.detail', 'Only a pending order can be cancelled.');
    }

    public function testItRefusesToMarkAsPaidAnOrderWhoseServerIsGone(): void
    {
        $order = $this->makeOrder([
            'status' => Order::STATUS_PENDING,
            'type' => Order::TYPE_RENEWAL,
            'metadata' => ['server_id' => '999999', 'product_id' => '1'],
        ]);

        $response = $this->patchJson('/api/application/billing/orders/' . $order->id, ['action' => 'mark_paid']);

        $response->assertStatus(Response::HTTP_BAD_REQUEST);
        $response->assertJsonPath('errors.0.detail', 'The server this order is about no longer exists.');
    }

    public function testItRejectsAnUnknownAction(): void
    {
        $order = $this->makeOrder(['status' => Order::STATUS_PENDING]);

        $response = $this->patchJson('/api/application/billing/orders/' . $order->id, ['action' => 'delete_everything']);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testItReturnsNotFoundForAnOrderThatDoesNotExist(): void
    {
        $response = $this->getJson('/api/application/billing/orders/999999');

        $this->assertNotFoundJson($response);
    }
}
