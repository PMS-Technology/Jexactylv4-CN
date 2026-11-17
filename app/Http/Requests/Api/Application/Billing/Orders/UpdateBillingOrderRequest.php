<?php

namespace Everest\Http\Requests\Api\Application\Billing\Orders;

use Everest\Models\AdminRole;
use Illuminate\Validation\Rule;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdateBillingOrderRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            // `mark_paid` settles the order and carries out what it paid for; `cancel`
            // gives it up.
            'action' => ['required', 'string', Rule::in(['mark_paid', 'cancel'])],
        ];
    }

    public function permission(): string
    {
        return AdminRole::BILLING_ORDERS;
    }
}
