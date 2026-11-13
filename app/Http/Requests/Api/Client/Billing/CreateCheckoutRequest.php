<?php

namespace Everest\Http\Requests\Api\Client\Billing;

use Everest\Http\Requests\Api\Client\ClientApiRequest;

class CreateCheckoutRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return [
            // The payment method the customer picked; it decides which channel the
            // money is collected through.
            'payment_method' => 'required|string|max:191',
            'product_id' => 'required|int|exists:products,id',
            'node_id' => 'nullable|int|exists:nodes,id',
            'server_id' => 'nullable|int|exists:servers,id',
            'egg_id' => 'nullable|int|exists:eggs,id',
            'variables' => 'nullable|array',
            'discount_code' => 'nullable|string|exists:discount_codes,code',
        ];
    }
}
