<?php

namespace Everest\Http\Requests\Api\Client\Billing;

use Everest\Http\Requests\Api\Client\ClientApiRequest;

class ProcessUpgradeRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return [
            // The payment method the customer picked; it decides which channel the
            // money is collected through.
            'payment_method' => 'required|string|max:191',
            'product_id' => 'required|int|exists:products,id',
        ];
    }
}
