<?php

namespace Everest\Http\Requests\Api\Application\Billing;

use Everest\Models\AdminRole;
use Illuminate\Validation\Rule;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class UpdatePaymentChannelRequest extends ApplicationApiRequest
{
    public function permission(): string
    {
        return AdminRole::BILLING_UPDATE;
    }

    public function rules(): array
    {
        return [
            'channel' => ['required', 'string', Rule::enum(PaymentChannel::class)],
            // The credentials are optional: an administrator may only want to change
            // one of them, and the panel keeps the rest.
            'secret' => 'nullable|string|max:500',
            'pid' => 'nullable|string|max:191',
            'key' => 'nullable|string|max:500',
            'gateway_url' => 'nullable|string|max:500',
            'api_key' => 'nullable|string|max:500',
            'webhook_secret' => 'nullable|string|max:500',
            'merchant_id' => 'nullable|string|max:191',
            'private_key' => 'nullable|string|max:4000',
            'public_key' => 'nullable|string|max:4000',
        ];
    }
}
