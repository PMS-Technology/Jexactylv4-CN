<?php

namespace Everest\Tests\Unit\Services\Billing;

use Everest\Models\User;
use Everest\Tests\TestCase;
use Everest\Models\Billing\Product;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Services\Billing\CheckoutContext;
use Everest\Services\Billing\Channels\ChannelRoute;

class PaymentChannelTest extends TestCase
{
    public function testAChannelIsOnlyConfiguredWhenEveryCredentialIsThere(): void
    {
        config([
            'modules.billing.channels.epay.pid' => '1001',
            'modules.billing.channels.epay.key' => 'secret',
            'modules.billing.channels.epay.gateway_url' => '',
        ]);

        $this->assertFalse(PaymentChannel::Epay->isConfigured());

        config(['modules.billing.channels.epay.gateway_url' => 'https://pay.example.test']);

        $this->assertTrue(PaymentChannel::Epay->isConfigured());
    }

    /**
     * Installations set up before the payment channels page stored the Stripe key in
     * `keys:secret`, so that setting still counts.
     */
    public function testStripeFallsBackToTheOldKeySetting(): void
    {
        config([
            'modules.billing.channels.stripe.secret' => '',
            'modules.billing.keys.secret' => 'sk_live_old',
        ]);

        // The old setting is found, so the channel counts as configured.
        $this->assertTrue(PaymentChannel::Stripe->isConfigured());
        $this->assertSame('sk_live_old', PaymentChannel::Stripe->setting('secret'));

        // The channel's own setting wins when it is filled in.
        config(['modules.billing.channels.stripe.secret' => 'sk_live_new']);

        $this->assertTrue(PaymentChannel::Stripe->isConfigured());
        $this->assertSame('sk_live_new', PaymentChannel::Stripe->setting('secret'));

        // With neither, the channel is not usable.
        config([
            'modules.billing.channels.stripe.secret' => '',
            'modules.billing.keys.secret' => '',
        ]);

        $this->assertFalse(PaymentChannel::Stripe->isConfigured());
    }

    public function testEachChannelKnowsWhichOfItsKeysAreSecret(): void
    {
        $this->assertSame(['secret'], PaymentChannel::Stripe->secretKeys());
        $this->assertSame(['key'], PaymentChannel::Epay->secretKeys());
        $this->assertSame(['api_key', 'webhook_secret'], PaymentChannel::Creem->secretKeys());
        $this->assertSame(['api_key', 'private_key'], PaymentChannel::Waffo->secretKeys());
        $this->assertSame(['api_key', 'private_key'], PaymentChannel::WaffoPancake->secretKeys());

        // The merchant id and the gateway address are not secret.
        $this->assertSame(['pid', 'gateway_url'], PaymentChannel::Epay->publicKeys());
        $this->assertSame(['merchant_id', 'public_key'], PaymentChannel::Waffo->publicKeys());
        $this->assertSame(['merchant_id', 'public_key'], PaymentChannel::WaffoPancake->publicKeys());
    }

    public function testOnlyTheChannelsThatNotifyThePanelNeedACallbackAddress(): void
    {
        $this->assertFalse(PaymentChannel::Stripe->usesCallbacks());
        $this->assertFalse(PaymentChannel::Epay->usesCallbacks());
        $this->assertTrue(PaymentChannel::Creem->usesCallbacks());
        $this->assertTrue(PaymentChannel::Waffo->usesCallbacks());
        $this->assertTrue(PaymentChannel::WaffoPancake->usesCallbacks());
    }

    /**
     * Pancake is Waffo's crypto product, so it is set up with the same credentials as
     * the acquiring gateway; only the payment method differs.
     */
    public function testPancakeTakesTheSameCredentialsAsWaffo(): void
    {
        $this->assertSame(
            PaymentChannel::Waffo->requiredKeys(),
            PaymentChannel::WaffoPancake->requiredKeys()
        );
    }

    // --- Routing ---------------------------------------------------------------

    /**
     * A payment method that names no channel-specific method is the channel itself.
     */
    public function testAPlainIdentifierIsTheChannel(): void
    {
        foreach (['stripe', 'creem', 'waffo', 'waffo_pancake'] as $identifier) {
            $route = ChannelRoute::fromIdentifier($identifier);

            $this->assertSame(PaymentChannel::from($identifier), $route->channel);
            $this->assertNull($route->subtype);
            $this->assertSame($identifier, $route->identifier());
        }
    }

    /**
     * Epay serves several payment methods, so the part after the colon is the method
     * within the channel.
     */
    public function testEpayKeepsTheMethodAfterTheColon(): void
    {
        $route = ChannelRoute::fromIdentifier('epay:wxpay');

        $this->assertSame(PaymentChannel::Epay, $route->channel);
        $this->assertSame('wxpay', $route->subtype);
        $this->assertSame('epay:wxpay', $route->identifier());
    }

    /**
     * The other channels have one flow each, so the method part is dropped.
     */
    public function testTheOtherChannelsIgnoreTheMethodAfterTheColon(): void
    {
        $route = ChannelRoute::fromIdentifier('stripe:wxpay');

        $this->assertSame(PaymentChannel::Stripe, $route->channel);
        $this->assertNull($route->subtype);
        $this->assertSame('stripe', $route->identifier());
    }

    public function testOnlyEpaySupportsMethodsWithinTheChannel(): void
    {
        $this->assertTrue(PaymentChannel::Epay->supportsSubtypes());
        $this->assertFalse(PaymentChannel::Stripe->supportsSubtypes());
        $this->assertFalse(PaymentChannel::Creem->supportsSubtypes());
        $this->assertFalse(PaymentChannel::Waffo->supportsSubtypes());
        $this->assertFalse(PaymentChannel::WaffoPancake->supportsSubtypes());
    }

    public function testAnUnknownChannelIsRejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        ChannelRoute::fromIdentifier('paypal');
    }

    /**
     * The order keeps everything the notification needs to carry the purchase out, so
     * the panel can fulfil the order even when the notification is all it gets.
     */
    public function testTheOrderMetadataCarriesTheWholeCheckout(): void
    {
        $context = new CheckoutContext(
            user: $this->user(),
            product: $this->product(),
            metadata: [
                'user_id' => '1',
                'product_id' => '2',
                'node_id' => '3',
                'server_id' => '0',
                'egg_id' => '4',
                'variables' => '[]',
                'order_type' => 'new',
                'discount_code' => 'SAVE25',
            ],
            price: 8.99,
            deploymentFee: 1.5,
            paymentChannel: 'epay',
        );

        $metadata = $context->orderMetadata();

        $this->assertSame('1', $metadata['user_id']);
        $this->assertSame('3', $metadata['node_id']);
        $this->assertSame('SAVE25', $metadata['discount_code']);
        $this->assertSame('epay', $metadata['payment_channel']);
        $this->assertSame(1.5, $metadata['deployment_fee']);
        $this->assertSame(9.99, $metadata['subtotal']);
        $this->assertSame($context->reference, $metadata['payment_request_id']);
        $this->assertSame(10.49, $context->total());
    }

    public function testTheReferenceIsUniquePerCheckout(): void
    {
        $user = $this->user();
        $product = $this->product();

        $first = new CheckoutContext($user, $product, ['order_type' => 'new']);
        $second = new CheckoutContext($user, $product, ['order_type' => 'new']);

        $this->assertNotSame($first->reference, $second->reference);
    }

    private function user(): User
    {
        $user = new User();
        $user->id = 1;
        $user->email = 'user@example.test';

        return $user;
    }

    private function product(): Product
    {
        $product = new Product();
        $product->id = 2;
        $product->name = 'Test';
        $product->price = 9.99;

        return $product;
    }
}
