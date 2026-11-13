<?php

namespace Everest\Http\Controllers\Api\Application\Billing;

use Everest\Models\Setting;
use Everest\Facades\Activity;
use Illuminate\Http\Response;
use Everest\Enums\Billing\PaymentChannel;
use Everest\Services\Billing\Channels\ChannelManager;
use Everest\Http\Controllers\Api\Application\ApplicationApiController;
use Everest\Http\Requests\Api\Application\Billing\GetPaymentChannelsRequest;
use Everest\Http\Requests\Api\Application\Billing\UpdatePaymentChannelRequest;

/**
 * The payment channels the panel can collect money through.
 *
 * Several channels can be set up at the same time. Which of them a purchase goes
 * through is decided by the payment method the customer picked, not by one channel
 * being switched on here.
 */
class PaymentChannelController extends ApplicationApiController
{
    public function __construct(
        private ChannelManager $channels,
    ) {
        parent::__construct();
    }

    /**
     * The payment channels, with whether each one is configured.
     */
    public function index(GetPaymentChannelsRequest $request): array
    {
        return [
            'channels' => $this->channels->channels(),
        ];
    }

    /**
     * Stores the credentials of a channel.
     */
    public function update(UpdatePaymentChannelRequest $request): Response
    {
        $channel = PaymentChannel::from((string) $request->input('channel'));

        foreach ($channel->requiredKeys() as $key) {
            if (!$request->has($key)) {
                continue;
            }

            $value = (string) $request->input($key);

            Setting::set('settings::modules:billing:channels:' . $channel->value . ':' . $key, $value);

            // The settings are copied into the config once, when the application boots,
            // so the config has to be updated here too — otherwise the change would not
            // take effect until the next request, and the page would still report the
            // channel as unconfigured.
            config()->set('modules.billing.channels.' . $channel->value . '.' . $key, $value);
        }

        Activity::event('admin:billing:channels:update')
            ->property('channel', $channel->value)
            ->description('Billing payment channel credentials were updated')
            ->log();

        return $this->returnNoContent();
    }

    /**
     * Forgets the credentials of a channel.
     */
    public function destroy(UpdatePaymentChannelRequest $request): Response
    {
        $channel = PaymentChannel::from((string) $request->input('channel'));

        foreach ($channel->requiredKeys() as $key) {
            Setting::forget('settings::modules:billing:channels:' . $channel->value . ':' . $key);
            config()->set('modules.billing.channels.' . $channel->value . '.' . $key, null);
        }

        Activity::event('admin:billing:channels:reset')
            ->property('channel', $channel->value)
            ->description('Billing payment channel credentials were reset')
            ->log();

        return $this->returnNoContent();
    }
}
