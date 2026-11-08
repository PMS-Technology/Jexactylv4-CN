<?php

namespace Everest\Http\Controllers\Auth;

use Everest\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Everest\Exceptions\DisplayException;
use Everest\Services\Users\UserUpdateService;
use Illuminate\Database\Eloquent\ModelNotFoundException;

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
}
