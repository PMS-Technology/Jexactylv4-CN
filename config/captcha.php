<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Captcha defaults
    |--------------------------------------------------------------------------
    |
    | These values are only fallbacks. The panel stores the real switch,
    | provider and credentials in the `settings` table (`captcha:*` keys), so a
    | fresh installation starts with captcha disabled and no usable keys.
    | There are deliberately no environment variables for these options.
    |
    */

    'enabled' => false,

    'provider' => 'recaptcha',

    /*
    | Compare the hostname returned by the provider with the host used to solve
    | the challenge. Providers that do not return a hostname skip this check.
    */
    'verify_domain' => true,

    'http' => [
        'connect_timeout' => 5,
        'timeout' => 10,
    ],

    'recaptcha' => [
        'site_key' => '',
        'secret_key' => '',
        'verify_url' => 'https://www.google.com/recaptcha/api/siteverify',
        'script_url' => 'https://www.google.com/recaptcha/api.js',
    ],

    'hcaptcha' => [
        'site_key' => '',
        'secret_key' => '',
        'verify_url' => 'https://api.hcaptcha.com/siteverify',
        'script_url' => 'https://js.hcaptcha.com/1/api.js',
    ],

    'turnstile' => [
        'site_key' => '',
        'secret_key' => '',
        'verify_url' => 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        'script_url' => 'https://challenges.cloudflare.com/turnstile/v0/api.js',
    ],

    'geetest' => [
        // GeeTest calls these values captcha_id and captcha_key.
        'site_key' => '',
        'secret_key' => '',
        'verify_url' => 'https://gcaptcha4.geetest.com/validate',
        'script_url' => 'https://static.geetest.com/v4/gt4.js',
    ],

    'corptcha' => [
        // Corptcha calls these values Site ID and Secret.
        'site_key' => '',
        'secret_key' => '',
        'api_base' => 'https://cpt-api.25y.cn',
        'script_url' => 'https://res.25y.cn/corptcha/corptcha.iife.js',
    ],
];
