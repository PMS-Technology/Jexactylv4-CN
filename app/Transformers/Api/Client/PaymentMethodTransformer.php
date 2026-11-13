<?php

namespace Everest\Transformers\Api\Client;

use Everest\Models\Billing\PaymentMethod;
use Everest\Transformers\Api\Transformer;

/**
 * A payment method as the customer sees it at checkout.
 *
 * The identifier is what decides the flow, so the client sends it back with the
 * checkout; the channel behind it is not exposed.
 */
class PaymentMethodTransformer extends Transformer
{
    /**
     * Return the resource name for the JSONAPI output.
     */
    public function getResourceName(): string
    {
        return PaymentMethod::RESOURCE_NAME;
    }

    public function transform(PaymentMethod $model): array
    {
        return [
            'id' => $model->id,
            'identifier' => $model->identifier,
            'name' => $model->name,
            'icon' => $model->icon,
            'description' => $model->description,
        ];
    }
}
