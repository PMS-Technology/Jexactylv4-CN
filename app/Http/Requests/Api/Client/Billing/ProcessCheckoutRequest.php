<?php

namespace Everest\Http\Requests\Api\Client\Billing;

use Everest\Http\Requests\Api\Client\ClientApiRequest;

/**
 * The customer coming back from the payment gateway.
 *
 * Which of the two fields is filled depends on the gateway: Stripe sends the checkout
 * session id, the gateways that notify the panel send the payment reference.
 */
class ProcessCheckoutRequest extends ClientApiRequest
{
    public function rules(): array
    {
        return [
            'session' => 'nullable|string|max:191',
            'reference' => 'nullable|string|max:191',
        ];
    }
}
