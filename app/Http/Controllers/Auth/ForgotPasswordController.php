<?php

namespace Everest\Http\Controllers\Auth;

use Everest\Models\User;
use Illuminate\Http\Request;
use Psr\Log\LoggerInterface;
use Illuminate\Http\JsonResponse;
use Everest\Mail\PasswordResetEmail;
use Everest\Services\Mail\MailService;
use Everest\Exceptions\DisplayException;
use Illuminate\Support\Facades\Password;
use Everest\Services\Users\UserUpdateService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\Mailer\Exception\TransportException;

class ForgotPasswordController extends AbstractLoginController
{
    /**
     * ForgotPasswordController constructor.
     */
    public function __construct(private UserUpdateService $updateService)
    {
        parent::__construct();
    }

    /**
     * Validate the information provided for resetting a password.
     */
    protected function verify(Request $request): JsonResponse
    {
        // An unknown email must fail exactly like a wrong recovery code. The catch used to
        // name DisplayException, so firstOrFail() escaped as a 404 and revealed which
        // emails have accounts.
        try {
            $user = User::where('email', $request->input('email'))->firstOrFail();
        } catch (ModelNotFoundException) {
            throw new DisplayException('The information provided was incorrect.');
        }

        if (!$user->recovery_code || !password_verify($request->input('code'), $user->recovery_code)) {
            throw new DisplayException('The information provided was incorrect.');
        }

        if ($request->input('password') !== $request->input('password_confirm')) {
            throw new DisplayException('The passwords entered do not match.');
        }

        $user = $this->updateService->handle($user, ['password' => $request->input('password')]);

        if (!$user->use_totp) {
            return $this->sendLoginResponse($user, $request);
        }

        // Two-factor accounts are not signed in here; they log in again through the checkpoint.
        // A JSON answer replaces the redirect to the login page, which the XHR followed and
        // read as an HTML body.
        return new JsonResponse(['data' => ['complete' => false]]);

    }

    /**
     * Send a password reset link to the address of an account.
     *
     * The account is looked up only after the panel answered the same way for
     * every address, so the endpoint cannot be used to find out which
     * addresses have an account.
     *
     * @throws DisplayException
     */
    public function sendLink(Request $request, LoggerInterface $logger): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $mailer = app(MailService::class);

        // Checked before the address is looked up, otherwise the answer would
        // tell apart an address with an account from one without.
        if (!$mailer->enabled()) {
            throw new DisplayException('Mail delivery is turned off on this panel. Reset your password with your recovery code instead.');
        }

        $user = User::where('email', $request->input('email'))->first();

        if ($user) {
            $this->sendResetLink($user, $mailer, $logger);
        }

        return new JsonResponse(['data' => ['complete' => true]]);
    }

    /**
     * Create a reset token and mail the link it belongs to.
     */
    private function sendResetLink(User $user, MailService $mailer, LoggerInterface $logger): void
    {
        $token = Password::broker()->createToken($user);

        $link = url(sprintf('/auth/password/reset/%s?email=%s', $token, urlencode($user->email)));

        try {
            $mailer->send(
                new PasswordResetEmail($link, (int) config('auth.passwords.users.expire', 60)),
                $user->email,
                $user->username
            );
        } catch (TransportException $exception) {
            // The token is useless without the mail, so it is thrown away. The
            // failure is only logged, because the answer to the request must
            // not tell apart an address with an account from one without.
            Password::broker()->deleteToken($user);

            $logger->warning('A password reset link could not be sent.', ['error' => $exception->getMessage()]);
        }
    }
}
