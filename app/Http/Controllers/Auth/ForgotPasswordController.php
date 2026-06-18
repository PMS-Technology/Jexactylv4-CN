<?php

namespace Everest\Http\Controllers\Auth;

use Everest\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Everest\Exceptions\DisplayException;
use Everest\Services\Users\UserUpdateService;

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
    protected function verify(Request $request): JsonResponse|RedirectResponse
    {
        try {
            $user = User::where('email', $request->input('email'))->firstOrFail();
        } catch (DisplayException $ex) {
            throw new DisplayException(trans('exceptions.auth.incorrect_information'));
        }

        if (!$user->recovery_code || !password_verify($request->input('code'), $user->recovery_code)) {
            throw new DisplayException(trans('exceptions.auth.incorrect_information'));
        }

        if ($request->input('password') !== $request->input('password_confirm')) {
            throw new DisplayException(trans('exceptions.auth.passwords_mismatch'));
        }

        $user = $this->updateService->handle($user, ['password' => $request->input('password')]);

        if (!$user->use_totp) {
            return $this->sendLoginResponse($user, $request);
        }

        return redirect()->route('auth.login');

    }
}
