<?php

namespace Everest\Transformers\Api\Application;

use Everest\Models\Billing\PaymentMethod;
use Everest\Transformers\Api\Transformer;

class PaymentMethodTransformer extends Transformer
{
    public function getResourceName(): string
    {
        return PaymentMethod::RESOURCE_NAME;
    }

    /**
     * Transform this model into a representation that can be consumed by a client.
     */
    public function transform(PaymentMethod $model): array
    {
        return [
            'id' => $model->id,
            'uuid' => $model->uuid,
            'identifier' => $model->identifier,
            'name' => $model->name,
            'icon' => $model->icon,
            'description' => $model->description,
            'enabled' => $model->enabled,
            'sort' => $model->sort,
            // The channel this method pays through, so the admin page can show it
            // without the client having to know the routing rules.
            'channel' => $model->channelKey(),
            'created_at' => $model->created_at->toIso8601String(),
            'updated_at' => $model->updated_at->toIso8601String(),
        ];
    }
}
