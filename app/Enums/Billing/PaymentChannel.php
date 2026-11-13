<?php

namespace Everest\Enums\Billing;

/**
 * The payment channels the billing module can collect money through.
 *
 * A channel is the gateway itself — the thing that takes the money. Several channels
 * can be set up at the same time; the administrator fills in the credentials for each
 * one on the payment channels page.
 *
 * The channels are addressed by an identifier, which is also the prefix of a payment
 * method: `stripe` is a channel on its own, `epay` is the channel behind `epay:wxpay`.
 */
enum PaymentChannel: string
{
    case Stripe = 'stripe';
    case Epay = 'epay';
    case Creem = 'creem';
    case Waffo = 'waffo';
    case WaffoPancake = 'waffo_pancake';

    /**
     * The label shown in the admin interface.
     */
    public function label(): string
    {
        return match ($this) {
            self::Stripe => 'Stripe',
            self::Epay => '易支付 (Epay)',
            self::Creem => 'Creem',
            self::Waffo => 'Waffo 聚合网关',
            self::WaffoPancake => 'Waffo Pancake MoR',
        };
    }

    /**
     * A one-line description of what the channel is, shown under its name.
     */
    public function description(): string
    {
        return match ($this) {
            self::Stripe => '面向国际信用卡的官方支付服务。',
            self::Epay => '国内常见的易支付聚合协议，通过商户 ID 与密钥签名。',
            self::Creem => 'Merchant of Record，负责税务与发票，Webhook 通知付款结果。',
            self::Waffo => '覆盖多地区的收单网关，RSA 签名，回调通知付款结果。',
            self::WaffoPancake => 'Waffo 旗下的加密货币 Merchant of Record 收款平台。',
        };
    }

    /**
     * Whether the channel serves more than one payment method.
     *
     * Epay is told which method to use through its `type` parameter, so a payment
     * method can name one — `epay:wxpay`. The other channels have a single flow each,
     * so their payment methods name only the channel.
     */
    public function supportsSubtypes(): bool
    {
        return $this === self::Epay;
    }

    /**
     * Whether the channel notifies the panel over HTTP when a payment settles, rather
     * than the panel pulling the result itself after the customer returns.
     */
    public function usesCallbacks(): bool
    {
        return match ($this) {
            self::Stripe, self::Epay => false,
            self::Creem, self::Waffo, self::WaffoPancake => true,
        };
    }

    /**
     * The settings keys this channel needs before it can be used. They are stored under
     * `settings::modules:billing:channels:<channel>:<key>`.
     *
     * @return string[]
     */
    public function requiredKeys(): array
    {
        return match ($this) {
            self::Stripe => ['secret'],
            self::Epay => ['pid', 'key', 'gateway_url'],
            self::Creem => ['api_key', 'webhook_secret'],
            self::Waffo => ['api_key', 'merchant_id', 'private_key', 'public_key'],
            // Pancake speaks the same acquiring API as Waffo, so it takes the same
            // credentials; only the payment method differs.
            self::WaffoPancake => ['api_key', 'merchant_id', 'private_key', 'public_key'],
        };
    }

    /**
     * The settings keys that hold a secret and so must never be sent to the browser.
     *
     * @return string[]
     */
    public function secretKeys(): array
    {
        return match ($this) {
            self::Stripe => ['secret'],
            self::Epay => ['key'],
            self::Creem => ['api_key', 'webhook_secret'],
            self::Waffo => ['api_key', 'private_key'],
            self::WaffoPancake => ['api_key', 'private_key'],
        };
    }

    /**
     * The settings keys that are not secret, and so can be shown to an administrator.
     *
     * @return string[]
     */
    public function publicKeys(): array
    {
        return match ($this) {
            self::Stripe => [],
            self::Epay => ['pid', 'gateway_url'],
            self::Creem => [],
            self::Waffo => ['merchant_id', 'public_key'],
            self::WaffoPancake => ['merchant_id', 'public_key'],
        };
    }

    /**
     * Whether every required key for this channel has been filled in.
     */
    public function isConfigured(): bool
    {
        foreach ($this->requiredKeys() as $key) {
            if ($this->setting($key) === null || $this->setting($key) === '') {
                return false;
            }
        }

        return true;
    }

    /**
     * Reads one of this channel's settings.
     *
     * Stripe keeps its key in `keys:secret` on installations that were set up before
     * the payment channels page existed, so that setting is read as a fallback.
     */
    public function setting(string $key): ?string
    {
        $value = config('modules.billing.channels.' . $this->value . '.' . $key);

        if (($value === null || $value === '') && $this === self::Stripe && $key === 'secret') {
            $value = config('modules.billing.keys.secret');
        }

        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }
}
