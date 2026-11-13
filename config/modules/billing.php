<?php

return [
    /*
     * Enable or disable the billing module.
     */
    'enabled' => env('BILLING_ENABLED', false),

    /*
     * Configure the secret API key for Stripe.
     */
    'keys' => [
        'secret' => env('BILLING_SECRET_KEY', ''),
    ],

    /*
     * The payment channels the panel can collect money through. Several of them can be
     * set up at the same time; which one a purchase goes through is decided by the
     * payment method the customer picked.
     *
     * Every value here can be overridden from the admin interface, which stores it under
     * `settings::modules:billing:channels:<channel>:<key>`.
     */
    'channels' => [
        'stripe' => [
            'secret' => env('BILLING_STRIPE_SECRET', ''),
        ],
        'epay' => [
            'pid' => env('BILLING_EPAY_PID', ''),
            'key' => env('BILLING_EPAY_KEY', ''),
            'gateway_url' => env('BILLING_EPAY_GATEWAY_URL', ''),
        ],
        'creem' => [
            'api_key' => env('BILLING_CREEM_API_KEY', ''),
            'webhook_secret' => env('BILLING_CREEM_WEBHOOK_SECRET', ''),
            'base_url' => env('BILLING_CREEM_BASE_URL', 'https://api.creem.io'),
        ],
        'waffo' => [
            'api_key' => env('BILLING_WAFFO_API_KEY', ''),
            'merchant_id' => env('BILLING_WAFFO_MERCHANT_ID', ''),
            'private_key' => env('BILLING_WAFFO_PRIVATE_KEY', ''),
            'public_key' => env('BILLING_WAFFO_PUBLIC_KEY', ''),
            'base_url' => env('BILLING_WAFFO_BASE_URL', 'https://api.waffo.com'),
        ],
        'waffo_pancake' => [
            'api_key' => env('BILLING_PANCAKE_API_KEY', ''),
            'merchant_id' => env('BILLING_PANCAKE_MERCHANT_ID', ''),
            'private_key' => env('BILLING_PANCAKE_PRIVATE_KEY', ''),
            'public_key' => env('BILLING_PANCAKE_PUBLIC_KEY', ''),
            'base_url' => env('BILLING_PANCAKE_BASE_URL', 'https://api.waffo.com'),
            'currency' => env('BILLING_PANCAKE_CURRENCY', 'USDC'),
        ],
    ],

    /*
     * Set a currency code and symbol to use for billing.
     */
    'currency' => [
        'symbol' => '$',
        'code' => 'usd',
    ],

    /*
     * Configure URLs for legal documentation.
     */
    'links' => [
        'terms' => '',
        'privacy' => '',
    ],

    /*
     * Configure renewal and suspension settings.
     */
    'renewal' => [
        'days' => env('BILLING_RENEWAL_DAYS', 30),
        'threshold' => env('BILLING_RENEWAL_THRESHOLD', 7),
    ],

    /*
     * Control whether users should be allowed to upgrade their plan.
     */
    'allow_upgrades' => env('BILLING_ALLOW_UPGRADES', true),
];
