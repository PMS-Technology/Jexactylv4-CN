<?php

namespace Everest\Http\Controllers\Api\Application\Settings;

use Everest\Mail\TestEmail;
use Everest\Models\Setting;
use Everest\Facades\Activity;
use Illuminate\Http\Response;
use Illuminate\Http\JsonResponse;
use Everest\Services\Mail\MailService;
use Everest\Services\Mail\MailSettings;
use Everest\Exceptions\DisplayException;
use Symfony\Component\Mailer\Exception\TransportException;
use Everest\Http\Controllers\Api\Application\ApplicationApiController;
use Everest\Http\Requests\Api\Application\Settings\SendTestEmailRequest;
use Everest\Http\Requests\Api\Application\Settings\GetMailSettingsRequest;
use Everest\Http\Requests\Api\Application\Settings\UpdateMailSettingsRequest;

class MailController extends ApplicationApiController
{
    /**
     * MailController constructor.
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * The mail configuration of the panel. The password is not part of it;
     * the form only shows whether one is stored.
     */
    public function index(GetMailSettingsRequest $request): JsonResponse
    {
        return new JsonResponse(app(MailSettings::class)->configuration());
    }

    /**
     * Store the mail configuration of the panel.
     *
     * @throws \Throwable
     */
    public function update(UpdateMailSettingsRequest $request): Response
    {
        $values = $request->validated();

        // An empty password means "keep the stored one"; the form never sends
        // the secret back to the browser.
        if (($values['password'] ?? '') === '') {
            unset($values['password']);
        }

        foreach ($values as $key => $value) {
            Setting::set('settings::mail:' . $key, $this->stringify($value));
        }

        Activity::event('admin:settings:mail')
            ->property('driver', $values['driver'])
            ->property('enabled', $values['enabled'])
            ->description('The mail settings were updated')
            ->log();

        return $this->returnNoContent();
    }

    /**
     * Send a message through the configured transport, so that an admin can
     * check the settings without leaving the panel.
     *
     * @throws \Throwable
     */
    public function test(SendTestEmailRequest $request): Response
    {
        $recipient = $request->input('email');

        try {
            app(MailService::class)->send(new TestEmail($recipient), $recipient);
        } catch (TransportException $exception) {
            throw new DisplayException('The mail server rejected the message: ' . $exception->getMessage());
        }

        Activity::event('admin:settings:mail:test')
            ->property('email', $recipient)
            ->description('A test mail was sent')
            ->log();

        return $this->returnNoContent();
    }

    /**
     * Settings are stored as strings, so a flag has to be written in a shape
     * that reads back as the same value.
     */
    private function stringify(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if ($value === null) {
            return '';
        }

        return (string) $value;
    }
}
