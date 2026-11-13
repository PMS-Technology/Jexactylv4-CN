<?php

use Illuminate\Support\Facades\Route;
use Everest\Http\Controllers\Api\Client\Billing;

/*
|--------------------------------------------------------------------------
| Payment Notification Routes
|--------------------------------------------------------------------------
|
| Endpoint: /api/client/billing
|
| These are the callbacks the payment gateways send when a payment settles.
| They come from the outside, so they carry no panel credentials: each one
| proves the notification is genuine by checking the signature the gateway
| signs the request with.
|
| They are registered outside the authenticated API groups and outside the
| `web` group, so they are not behind CSRF protection either.
|
*/

Route::post('/epay/notify', Billing\EpayNotificationController::class);
Route::post('/creem/notify', Billing\CreemNotificationController::class);
Route::post('/waffo/notify', Billing\WaffoNotificationController::class);
Route::post('/waffo_pancake/notify', Billing\PancakeNotificationController::class);
