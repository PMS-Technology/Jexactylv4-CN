<?php

namespace Everest\Http\Middleware;

use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Everest\Events\Auth\FailedCaptcha;
use Illuminate\Contracts\Events\Dispatcher;
use Everest\Services\Captcha\CaptchaSettings;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;

class VerifyReCaptcha
{
    public function __construct(
        private Dispatcher $dispatcher,
        private CaptchaSettings $settings,
        private LoggerInterface $log,
    ) {
    }

    /**
     * Verify the challenge with whichever provider is currently selected. The
     * switch and provider are read from the settings table on every request.
     */
    public function handle(Request $request, \Closure $next): mixed
    {
        if (!$this->settings->enabled()) {
            return $next($request);
        }

        $provider = $this->settings->provider();
        $state = $request->input('state');

        // Discord and Google's OAuth flows carry their own CSRF "state" parameter through
        // this same middleware, which is not an encrypted captcha payload. Their state
        // values are prefixed so we can recognise and skip them here.
        if (is_string($state) && (str_starts_with($state, 'discord-') || str_starts_with($state, 'google-'))) {
            return $next($request);
        }

        // Older reCAPTCHA clients sent the token encrypted in the `state` field.
        $legacyToken = null;
        if ($provider === 'recaptcha' && is_string($state) && $state !== '') {
            try {
                $legacyToken = decrypt($state);
            } catch (\Throwable) {
                $legacyToken = null;
            }
        }

        if ($this->verify($request, $provider, is_string($legacyToken) ? $legacyToken : null)) {
            return $next($request);
        }

        $this->dispatcher->dispatch(new FailedCaptcha($request->ip(), null, $provider));

        throw new HttpException(Response::HTTP_BAD_REQUEST, 'Failed to validate captcha data.');
    }

    private function verify(Request $request, string $provider, ?string $legacyToken): bool
    {
        return match ($provider) {
            'recaptcha' => $this->verifyFormToken(
                $request,
                'g-recaptcha-response',
                $this->settings->secretKey('recaptcha'),
                $this->settings->verifyUrl('recaptcha'),
                true,
                $legacyToken
            ),
            'hcaptcha' => $this->verifyFormToken(
                $request,
                'h-captcha-response',
                $this->settings->secretKey('hcaptcha'),
                $this->settings->verifyUrl('hcaptcha'),
                true
            ),
            'turnstile' => $this->verifyFormToken(
                $request,
                'cf-turnstile-response',
                $this->settings->secretKey('turnstile'),
                $this->settings->verifyUrl('turnstile'),
                true
            ),
            'geetest' => $this->verifyGeetest($request),
            'corptcha' => $this->verifyCorptcha($request),
            default => false,
        };
    }

    /**
     * reCAPTCHA, hCaptcha and Turnstile all use the same
     * `{secret, response, remoteip}` form body and a `success` boolean.
     */
    private function verifyFormToken(
        Request $request,
        string $field,
        string $secret,
        string $url,
        bool $checkHost,
        ?string $tokenOverride = null,
    ): bool {
        $token = $tokenOverride ?? $this->input($request, $field);

        if ($token === '' || $secret === '' || $url === '') {
            return false;
        }

        try {
            $response = $this->client()->post($url, [
                'form_params' => [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ],
            ]);
        } catch (\Throwable) {
            return false;
        }

        if ($response->getStatusCode() !== 200) {
            return false;
        }

        $result = $this->json($response->getBody()->getContents());
        if (!is_array($result) || ($result['success'] ?? false) !== true) {
            return false;
        }

        if ($checkHost && $this->settings->verifyDomain()) {
            return $this->hostnameMatches($result['hostname'] ?? null, $request);
        }

        return true;
    }

    /**
     * GeeTest v4 validates a set of challenge fields plus an HMAC-SHA256 signature
     * made from the lot number and the captcha key.
     */
    private function verifyGeetest(Request $request): bool
    {
        $siteKey = $this->settings->siteKey('geetest');
        $secret = $this->settings->secretKey('geetest');
        $url = $this->settings->verifyUrl('geetest');

        $payload = [
            'lot_number' => $this->input($request, 'lot_number'),
            'captcha_output' => $this->input($request, 'captcha_output'),
            'pass_token' => $this->input($request, 'pass_token'),
            'gen_time' => $this->input($request, 'gen_time'),
        ];

        if ($siteKey === '' || $secret === '' || $url === '' || in_array('', $payload, true)) {
            return false;
        }

        $payload['sign_token'] = hash_hmac('sha256', $payload['lot_number'], $secret);
        $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query(['captcha_id' => $siteKey]);

        try {
            $response = $this->client()->post($url, ['form_params' => $payload]);
        } catch (\Throwable) {
            return false;
        }

        if ($response->getStatusCode() !== 200) {
            return false;
        }

        $result = $this->json($response->getBody()->getContents());

        return is_array($result) && ($result['result'] ?? null) === 'success';
    }

    /**
     * Corptcha's verify endpoint takes JSON and a Bearer secret, and binds the
     * one-time token to the purpose it was issued for.
     */
    private function verifyCorptcha(Request $request): bool
    {
        $token = $this->input($request, 'captchaToken');
        $siteKey = $this->settings->siteKey('corptcha');
        $secret = $this->settings->secretKey('corptcha');

        // Temporary diagnostics: the 401 UNAUTHORIZED from Corptcha means the secret it
        // receives is not the one it expects. Log fingerprints only, never the secret.
        $this->log->warning('Corptcha verify attempt', [
            'siteKey' => $siteKey,
            'secretLen' => strlen($secret),
            'secretSha256' => substr(hash('sha256', $secret), 0, 12),
            'secretHasWhitespace' => trim($secret) !== $secret,
            'tokenLen' => strlen($token),
            'tokenHead' => substr($token, 0, 8),
            'purpose' => $this->purpose($request),
            'apiBase' => $this->settings->apiBase(),
        ]);

        if ($token === '' || $siteKey === '' || $secret === '') {
            return false;
        }

        try {
            $response = $this->client()->post($this->settings->apiBase() . '/v1/verify', [
                'http_errors' => false,
                'headers' => [
                    'Authorization' => 'Bearer ' . $secret,
                    'Accept' => 'application/json',
                ],
                'json' => [
                    'token' => $token,
                    'purpose' => $this->purpose($request),
                    'siteKey' => $siteKey,
                ],
            ]);
        } catch (\Throwable $e) {
            $this->log->warning('Corptcha verify request failed (network error)', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        $status = $response->getStatusCode();
        $body = $response->getBody()->getContents();
        $result = $this->json($body);

        // Corptcha answers a successful verification with any 2xx status (201 in
        // production), so the `success` flag in the body is what decides.
        if ($status < 200 || $status > 299 || !is_array($result) || ($result['success'] ?? false) !== true) {
            $this->log->warning('Corptcha verify failed', [
                'status' => $status,
                'errorCode' => $result['errorCode'] ?? null,
                'message' => $result['message'] ?? null,
                'body' => mb_substr($body, 0, 500),
            ]);

            return false;
        }

        return true;
    }

    private function purpose(Request $request): string
    {
        $purpose = $this->input($request, 'captcha-purpose');

        return $purpose !== '' && preg_match('/^[a-zA-Z0-9_-]{1,32}$/', $purpose)
            ? $purpose
            : 'login';
    }

    private function input(Request $request, string $key): string
    {
        $value = $request->input($key);

        return is_string($value) ? trim($value) : '';
    }

    private function hostnameMatches(mixed $hostname, Request $request): bool
    {
        $host = parse_url($request->url(), PHP_URL_HOST);

        return is_string($hostname) && is_string($host) && $hostname !== ''
            && hash_equals(strtolower($hostname), strtolower($host));
    }

    private function json(string $body): mixed
    {
        try {
            return json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }
    }

    private function client(): Client
    {
        return new Client([
            'connect_timeout' => (float) config('captcha.http.connect_timeout', 5),
            'timeout' => (float) config('captcha.http.timeout', 10),
        ]);
    }
}
