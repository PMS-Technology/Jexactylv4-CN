<?php

namespace Everest\Http\Requests\Api\Application\Billing\PaymentMethods;

use Everest\Models\AdminRole;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Models\Billing\PaymentMethod;
use Everest\Http\Requests\Api\Application\ApplicationApiRequest;

class StorePaymentMethodRequest extends ApplicationApiRequest
{
    public function rules(): array
    {
        return [
            // The identifier decides the flow, so it has to name a channel the panel
            // has. The part after the colon is the method within that channel.
            'identifier' => [
                'required',
                'string',
                'max:191',
                'regex:/^[a-z0-9_]+(:[a-z0-9_]+)?$/',
                $this->uniqueIdentifierRule(),
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (!$this->namesAKnownChannel((string) $value)) {
                        $fail('The identifier must start with a payment channel: ' . implode(', ', $this->channels()));
                    }
                },
            ],
            'name' => 'required|string|min:1|max:191',
            'icon' => 'nullable|string|max:300',
            'description' => 'nullable|string|max:300',
            'enabled' => 'required|bool',
            'sort' => 'required|integer',
        ];
    }

    public function permission(): string
    {
        return AdminRole::BILLING_UPDATE;
    }

    /**
     * Whether the identifier names a channel the panel has.
     */
    private function namesAKnownChannel(string $identifier): bool
    {
        $channel = explode(':', $identifier, 2)[0];

        return PaymentChannel::tryFrom($channel) !== null;
    }

    /**
     * The identifiers of the channels the panel has.
     *
     * @return string[]
     */
    private function channels(): array
    {
        return array_map(fn (PaymentChannel $channel) => $channel->value, PaymentChannel::cases());
    }

    /**
     * Two methods cannot share an identifier, because that is what decides the flow.
     *
     * An existing method may keep its own identifier, so it is left out of the check.
     */
    private function uniqueIdentifierRule(): Unique
    {
        $rule = Rule::unique(PaymentMethod::class, 'identifier');

        $method = $this->route('paymentMethod');

        if ($method instanceof PaymentMethod) {
            $rule->ignore($method->id);
        }

        return $rule;
    }
}
