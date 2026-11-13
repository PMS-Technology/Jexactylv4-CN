<?php

namespace Everest\Services\Billing\Channels;

use phpseclib3\Crypt\RSA;
use phpseclib3\Crypt\RSA\PublicKey;
use phpseclib3\Crypt\RSA\PrivateKey;
use phpseclib3\Crypt\PublicKeyLoader;

/**
 * SHA256WithRSA signing and verification, the scheme the Waffo gateways use.
 *
 * The merchant signs its requests with its own private key and Waffo verifies them with
 * the matching public key; Waffo signs its responses and webhooks with its private key
 * and the merchant verifies them with the Waffo public key.
 *
 * Keys are PEM blocks, possibly without the header and footer lines — the Merchant
 * Portal shows them as a single line of base64 — so both forms are accepted.
 */
class RsaSignature
{
    /**
     * Signs a payload with the merchant's private key.
     */
    public static function sign(string $payload, string $privateKey): string
    {
        $key = RSA::loadPrivateKey(self::normalize($privateKey, 'PRIVATE'));

        // The library is typed against its own interfaces, so the concrete key is
        // narrowed here to reach the RSA specific padding and hash settings.
        if (!$key instanceof PrivateKey) {
            throw new \RuntimeException('The private key could not be read.');
        }

        return base64_encode($key->withHash('sha256')->withPadding(RSA::SIGNATURE_PKCS1)->sign($payload));
    }

    /**
     * Checks a base64 signature against a payload using the sender's public key.
     */
    public static function verify(string $payload, string $signature, string $publicKey): bool
    {
        if ($signature === '' || $publicKey === '') {
            return false;
        }

        try {
            $key = PublicKeyLoader::load(self::normalize($publicKey, 'PUBLIC'));
        } catch (\Throwable $exception) {
            return false;
        }

        if (!$key instanceof PublicKey) {
            return false;
        }

        try {
            return $key->withHash('sha256')->withPadding(RSA::SIGNATURE_PKCS1)->verify($payload, base64_decode($signature, true) ?: '');
        } catch (\Throwable $exception) {
            return false;
        }
    }

    /**
     * Puts a key into the PEM form the crypto library expects.
     *
     * A key copied from the Merchant Portal is often just the base64 body, so the
     * header and footer are added when they are missing.
     */
    private static function normalize(string $key, string $type): string
    {
        $key = trim($key);

        if (str_contains($key, '-----BEGIN')) {
            return $key;
        }

        return "-----BEGIN {$type} KEY-----\n" . chunk_split($key, 64, "\n") . "-----END {$type} KEY-----";
    }
}
