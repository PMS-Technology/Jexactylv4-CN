<?php

namespace Everest\Http\Requests\Api\Client\Billing;

use Everest\Http\Requests\Api\Client\ClientApiRequest;

class GetUpgradeChargeRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return [
            // The charge is worked out before the customer picks how to pay, so the
            // payment method is not part of this request.
            'product_id' => 'required|int|exists:products,id',
        ];
    }
}
