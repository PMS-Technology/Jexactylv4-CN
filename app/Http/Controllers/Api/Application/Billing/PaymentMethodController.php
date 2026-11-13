<?php

namespace Everest\Http\Controllers\Api\Application\Billing;

use Ramsey\Uuid\Uuid;
use Everest\Facades\Activity;
use Illuminate\Http\Response;
use Spatie\QueryBuilder\QueryBuilder;
use Everest\Models\Billing\PaymentMethod;
use Everest\Exceptions\Http\QueryValueOutOfRangeHttpException;
use Everest\Transformers\Api\Application\PaymentMethodTransformer;
use Everest\Http\Controllers\Api\Application\ApplicationApiController;
use Everest\Http\Requests\Api\Application\Billing\PaymentMethods\GetPaymentMethodsRequest;
use Everest\Http\Requests\Api\Application\Billing\PaymentMethods\StorePaymentMethodRequest;
use Everest\Http\Requests\Api\Application\Billing\PaymentMethods\DeletePaymentMethodRequest;

/**
 * The payment methods a customer can choose from at checkout.
 *
 * The identifier of a method decides the flow: it is the channel's own name,
 * optionally followed by a colon and the method within that channel — `stripe` is
 * Stripe itself, `epay:wxpay` is the WeChat Pay method of the Epay channel.
 */
class PaymentMethodController extends ApplicationApiController
{
    /**
     * Get all payment methods.
     */
    public function index(GetPaymentMethodsRequest $request): array
    {
        $perPage = (int) $request->query('per_page', '20');
        if ($perPage < 1 || $perPage > 100) {
            throw new QueryValueOutOfRangeHttpException('per_page', 1, 100);
        }

        $methods = QueryBuilder::for(PaymentMethod::query())
            ->allowedFilters(...['id', 'identifier', 'name', 'enabled'])
            ->allowedSorts(...['id', 'identifier', 'name', 'sort', 'created_at'])
            ->orderBy('sort')
            ->orderBy('id')
            ->paginate($perPage);

        return $this->transform($methods, PaymentMethodTransformer::class);
    }

    /**
     * Store a new payment method.
     */
    public function store(StorePaymentMethodRequest $request): array
    {
        $method = PaymentMethod::create([
            'uuid' => Uuid::uuid4()->toString(),
            'identifier' => $request->input('identifier'),
            'name' => $request->input('name'),
            'icon' => $request->input('icon'),
            'description' => $request->input('description'),
            'enabled' => $request->input('enabled'),
            'sort' => (int) $request->input('sort'),
        ]);

        Activity::event('admin:billing:payment-methods:create')
            ->subject($method)
            ->property('payment_method', $method)
            ->description('A billing payment method was created')
            ->log();

        return $this->transform($method, PaymentMethodTransformer::class);
    }

    /**
     * Update an existing payment method.
     */
    public function update(StorePaymentMethodRequest $request, PaymentMethod $paymentMethod): array
    {
        $paymentMethod->update([
            'identifier' => $request->input('identifier'),
            'name' => $request->input('name'),
            'icon' => $request->input('icon'),
            'description' => $request->input('description'),
            'enabled' => $request->input('enabled'),
            'sort' => (int) $request->input('sort'),
        ]);

        Activity::event('admin:billing:payment-methods:update')
            ->subject($paymentMethod)
            ->property('payment_method', $paymentMethod)
            ->property('new_data', $request->all())
            ->description('A billing payment method was updated')
            ->log();

        return $this->transform($paymentMethod, PaymentMethodTransformer::class);
    }

    /**
     * Delete a payment method.
     */
    public function delete(DeletePaymentMethodRequest $request, PaymentMethod $paymentMethod): Response
    {
        $paymentMethod->delete();

        Activity::event('admin:billing:payment-methods:delete')
            ->subject($paymentMethod)
            ->property('payment_method', $paymentMethod)
            ->description('A billing payment method was deleted')
            ->log();

        return $this->returnNoContent();
    }
}
