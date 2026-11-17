<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Mailer
    |--------------------------------------------------------------------------
    |
    | The panel is configured from the admin settings screen, not from the
    | environment, so nothing in this file reads an environment variable.
    | The values here are the fallback for a panel that has never had its
    | mail settings saved: every message is written to the application log
    | instead of being delivered.
    |
    | @see \Everest\Services\Mail\MailSettings
    |
    */

    'default' => 'log',

    /*
    |--------------------------------------------------------------------------
    | Mailer Configurations
    |--------------------------------------------------------------------------
    |
    | The transports the panel can deliver through. The SMTP transport is
    | filled in from the settings table when a message is sent, so the
    | values below are only the defaults of a fresh installation.
    |
    */

    'mailers' => [

        'smtp' => [
            'transport' => 'smtp',
            'scheme' => null,
            'url' => null,
            'host' => '127.0.0.1',
            'port' => 25,
            'username' => null,
            'password' => null,
            'timeout' => null,
            'local_domain' => null,
            'auto_tls' => true,
        ],

        'sendmail' => [
            'transport' => 'sendmail',
            'path' => '/usr/sbin/sendmail -bs -i',
        ],

        'log' => [
            'transport' => 'log',
            'channel' => null,
        ],

        'array' => [
            'transport' => 'array',
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Global "From" Address
    |--------------------------------------------------------------------------
    |
    | The sender of every message. The address and the name are taken from
    | the settings table; these values are the fallback for a panel that
    | has never had its mail settings saved.
    |
    */

    'from' => [
        'address' => 'no-reply@localhost',
        'name' => 'Panel',
    ],

    /*
    |--------------------------------------------------------------------------
    | Markdown Mail Settings
    |--------------------------------------------------------------------------
    |
    | If you are using Markdown based email rendering, you may configure
    | your theme and component paths here.
    |
    */

    'markdown' => [
        'theme' => 'default',

        'paths' => [
            resource_path('views/vendor/mail'),
        ],
    ],

];
