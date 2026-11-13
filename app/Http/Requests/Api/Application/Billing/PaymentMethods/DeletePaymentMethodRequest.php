<?php

namespace Everest\Http\Requests\Api\Application\Billing\PaymentMethods;

use Everest\Models\AdminRole;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class DeletePaymentMethodRequest extends ApplicationApiRequest
{
    public function permission(): string
    {
        return AdminRole::BILLING_UPDATE;
    }
}
