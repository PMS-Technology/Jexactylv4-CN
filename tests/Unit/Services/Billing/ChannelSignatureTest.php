<?php

namespace Everest\Tests\Unit\Services\Billing;

use Everest\Models\User;
use Everest\Tests\TestCase;
use Everest\Models\Billing\Product;
use Everest\Services\Billing\CheckoutContext;
use Everest\Services\Billing\Channels\EpayChannel;
use Everest\Services\Billing\Channels\ChannelRoute;
use Everest\Services\Billing\Channels\RsaSignature;

class ChannelSignatureTest extends TestCase
{
    /**
     * The Epay V1 signature is an MD5 over the sorted parameters, joined as
     * `key=value&key=value`, plus the merchant key. A real gateway has to agree with
     * it, so the formula is checked against the one the gateway uses rather than
     * against itself.
     */
    public function testEpaySignatureMatchesTheV1Formula(): void
    {
        $channel = $this->channel();

        $params = [
            'pid' => '1001',
            'type' => 'alipay',
            'out_trade_no' => 'PD1-2-abcdef',
            'notify_url' => 'https://panel.test/api/client/billing/epay/notify',
            'name' => 'Test Product',
            'money' => '12.34',
        ];

        $sign = $channel->sign($params, 'merchant-key');

        $expected = $params;
        ksort($expected);
        $source = '';
        foreach ($expected as $name => $value) {
            $source .= $name . '=' . $value . '&';
        }
        $source = substr($source, 0, -1);

        $this->assertSame(md5($source . 'merchant-key'), $sign);
    }

    /**
     * The empty values are left out of the signature, the way the gateway does it.
     */
    public function testEpaySignatureLeavesOutEmptyValues(): void
    {
        $channel = $this->channel();

        $params = [
            'pid' => '1001',
            'type' => 'alipay',
            'sitename' => '',
            'param' => null,
        ];

        $sign = $channel->sign($params, 'merchant-key');

        $this->assertSame(md5('pid=1001&type=alipaymerchant-key'), $sign);
    }

    /**
     * The older Epay builds signed the same parameters without the separators. A
     * callback signed that way is still accepted, so the order is not left unfulfilled.
     */
    public function testEpayCallbackAlsoAcceptsTheOlderSignatureFormat(): void
    {
        $channel = $this->channel();

        $params = [
            'pid' => '1001',
            'out_trade_no' => 'PD1-2-abcdef',
            'money' => '12.34',
        ];

        $expected = $params;
        ksort($expected);
        $source = '';
        foreach ($expected as $name => $value) {
            $source .= $name . $value;
        }

        $params['sign'] = md5($source . 'merchant-key');

        $this->assertTrue($channel->verify($params, 'merchant-key'));
    }

    public function testEpaySignatureDoesNotDependOnTheParameterOrder(): void
    {
        $channel = $this->channel();

        $params = [
            'pid' => '1001',
            'out_trade_no' => 'PD1-2-abcdef',
            'money' => '12.34',
        ];

        $this->assertSame(
            $channel->sign($params, 'merchant-key'),
            $channel->sign(array_reverse($params, true), 'merchant-key')
        );
    }

    public function testEpaySignatureLeavesOutTheSignatureFields(): void
    {
        $channel = $this->channel();

        $params = ['pid' => '1001', 'money' => '12.34'];
        $withSignature = $params + ['sign' => 'abc', 'sign_type' => 'MD5'];

        $this->assertSame(
            $channel->sign($params, 'merchant-key'),
            $channel->sign($withSignature, 'merchant-key')
        );
    }

    public function testEpayCallbackVerifiesOnlyTheRightSignature(): void
    {
        $channel = $this->channel();

        $params = [
            'pid' => '1001',
            'out_trade_no' => 'PD1-2-abcdef',
            'money' => '12.34',
            'trade_status' => 'TRADE_SUCCESS',
        ];
        $params['sign'] = $channel->sign($params, 'merchant-key');
        $params['sign_type'] = 'MD5';

        $this->assertTrue($channel->verify($params, 'merchant-key'));

        // A changed amount must not verify.
        $tampered = $params;
        $tampered['money'] = '1.00';
        $this->assertFalse($channel->verify($tampered, 'merchant-key'));

        // A missing signature must not verify.
        $this->assertFalse($channel->verify(['pid' => '1001'], 'merchant-key'));
    }

    /**
     * The gateway signs the parameters it receives, so the signature has to survive the
     * trip through the URL. This walks the request the way the gateway does: the query
     * string is parsed back into an array and the signature is checked over that.
     */
    public function testTheSignatureSurvivesTheTripThroughTheUrl(): void
    {
        $channel = $this->channel();

        $params = [
            'pid' => '1001',
            'type' => 'wxpay',
            'out_trade_no' => 'PD1-2-abcdef',
            'notify_url' => 'https://panel.test/api/client/billing/epay/notify',
            'return_url' => 'https://panel.test/account/billing/processing?reference=PD1-2-abcdef',
            'name' => '付费套餐',
            'money' => '12.34',
            'clientip' => '127.0.0.1',
        ];

        $params['sign'] = $channel->sign($params, 'merchant-key');
        $params['sign_type'] = 'MD5';

        // What the gateway receives.
        parse_str(http_build_query($params), $received);

        // The gateway's own signing rule.
        $sign = $received['sign'];
        unset($received['sign'], $received['sign_type']);
        ksort($received);

        $source = '';
        foreach ($received as $name => $value) {
            if (is_array($value) || $value === null || trim((string) $value) === '') {
                continue;
            }

            $source .= $name . '=' . $value . '&';
        }
        $source = substr($source, 0, -1);

        $this->assertSame(md5($source . 'merchant-key'), $sign);
    }

    /**
     * The payment method the customer picked travels to Epay as its `type` parameter,
     * so `epay:wxpay` has to reach the gateway as `wxpay`.
     */
    public function testThePaymentMethodIsSentToEpayAsItsType(): void
    {
        $channel = $this->channel();

        $params = $channel->checkoutParameters(
            $this->context(),
            ChannelRoute::fromIdentifier('epay:wxpay')
        );

        $this->assertSame('wxpay', $params['type']);
    }

    /**
     * A method that names no Epay type falls back to the one Epay treats as the
     * default, so the gateway still knows what to charge.
     */
    public function testEpayFallsBackToItsDefaultType(): void
    {
        $channel = $this->channel();

        $params = $channel->checkoutParameters(
            $this->context(),
            ChannelRoute::fromIdentifier('epay')
        );

        $this->assertSame('alipay', $params['type']);
    }

    /**
     * The Waffo gateways sign with SHA256WithRSA, so the signature is checked with the
     * public key that matches the private key.
     */
    public function testRsaSignatureRoundTrip(): void
    {
        $keys = $this->rsaKeyPair();

        $payload = '{"merchantOrderId":"PD1-2-abcdef","orderAmount":"12.34"}';
        $signature = RsaSignature::sign($payload, $keys['private']);

        $this->assertTrue(RsaSignature::verify($payload, $signature, $keys['public']));
        $this->assertFalse(RsaSignature::verify($payload . ' ', $signature, $keys['public']));
        $this->assertFalse(RsaSignature::verify($payload, $signature, $this->otherPublicKey()));
    }

    /**
     * The Merchant Portal shows the key as a single line of base64, without the PEM
     * header and footer, so that form has to work too.
     */
    public function testRsaSignatureAcceptsABareBase64Key(): void
    {
        $keys = $this->rsaKeyPair();
        $bare = $this->stripPem($keys['private']);

        $payload = 'payload';
        $signature = RsaSignature::sign($payload, $bare);

        $this->assertTrue(RsaSignature::verify($payload, $signature, $this->stripPem($keys['public'])));
    }

    public function testRsaSignatureRejectsAnEmptyKeyOrSignature(): void
    {
        $this->assertFalse(RsaSignature::verify('payload', 'signature', ''));
        $this->assertFalse(RsaSignature::verify('payload', '', 'not-a-key'));
    }

    private function channel(): EpayChannel
    {
        // The channel's own dependencies are not needed for signing.
        return (new \ReflectionClass(EpayChannel::class))->newInstanceWithoutConstructor();
    }

    private function context(): CheckoutContext
    {
        $user = new User();
        $user->id = 1;
        $user->email = 'user@example.test';

        $product = new Product();
        $product->id = 2;
        $product->name = 'Test';
        $product->price = 9.99;

        return new CheckoutContext($user, $product, ['order_type' => 'new']);
    }

    /**
     * @return array{private: string, public: string}
     */
    private function rsaKeyPair(): array
    {
        $resource = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);

        openssl_pkey_export($resource, $privateKey);
        $details = openssl_pkey_get_details($resource);

        return ['private' => $privateKey, 'public' => $details['key']];
    }

    private function otherPublicKey(): string
    {
        return $this->rsaKeyPair()['public'];
    }

    private function stripPem(string $key): string
    {
        return preg_replace('/-----[A-Z ]+-----|\s+/', '', $key);
    }
}
