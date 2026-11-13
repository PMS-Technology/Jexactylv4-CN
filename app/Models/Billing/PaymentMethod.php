<?php

namespace Everest\Models\Billing;

use Everest\Models\Model;
use Everest\Enums\Billing\PaymentChannel;

/**
 * A way for a customer to pay, offered at checkout.
 *
 * The identifier decides the flow. It is the channel's own identifier, optionally
 * followed by a colon and the method within that channel: `stripe` and `creem` are the
 * channels themselves, `epay:wxpay` is the WeChat Pay method of the Epay channel, and
 * `waffo_pancake` is the Pancake channel.
 *
 * @property int $id
 * @property string $uuid
 * @property string $identifier
 * @property string $name
 * @property string|null $icon
 * @property string|null $description
 * @property bool $enabled
 * @property int $sort
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class PaymentMethod extends Model
{
    /**
     * The resource name for this model when it is transformed into an
     * API representation using fractal.
     */
    public const RESOURCE_NAME = 'payment_method';

    /**
     * The table associated with the model.
     */
    protected $table = 'payment_methods';

    /**
     * Fields that are mass assignable.
     */
    protected $fillable = [
        'uuid', 'identifier', 'name', 'icon', 'description', 'enabled', 'sort',
    ];

    /**
     * Cast values to correct type.
     */
    protected $casts = [
        'enabled' => 'boolean',
        'sort' => 'integer',
    ];

    public static array $validationRules = [
        'uuid' => 'required|string|size:36',
        'identifier' => 'required|string|max:191|regex:/^[a-z0-9_]+(:[a-z0-9_]+)?$/',
        'name' => 'required|string|min:1|max:191',
        'icon' => 'nullable|string|max:300',
        'description' => 'nullable|string|max:300',
        'enabled' => 'required|bool',
        'sort' => 'required|integer',
    ];

    /**
     * The channel this method pays through.
     *
     * The part before the colon names the channel; anything after it is the method
     * within that channel, which only Epay passes on to the gateway.
     *
     * Null when the identifier names no channel the panel has — a row that was edited
     * outside the panel, say. Such a method cannot be used, so it is left out rather
     * than breaking the page it is listed on.
     */
    public function channel(): ?PaymentChannel
    {
        return PaymentChannel::tryFrom($this->channelKey());
    }

    /**
     * The channel's identifier, without the method part.
     */
    public function channelKey(): string
    {
        return explode(':', $this->identifier, 2)[0];
    }

    /**
     * The method within the channel, for the channels that have more than one.
     *
     * This is the `type` parameter the Epay gateway is given, so `epay:wxpay` yields
     * `wxpay`. A method that names no channel-specific type — `stripe` — yields null.
     */
    public function subtype(): ?string
    {
        $parts = explode(':', $this->identifier, 2);

        return isset($parts[1]) && $parts[1] !== '' ? $parts[1] : null;
    }
}
