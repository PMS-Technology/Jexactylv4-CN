import { startAuthentication } from '@simplewebauthn/browser';
import http from '$lib/api/http';

/**
 * Session endpoints under `/auth`, ported from `api/routes/auth/{login,passkey,register,password-reset}.ts`.
 * These are Blade routes rather than part of the client API; they answer with JSON and
 * set the session cookie.
 */

export interface AuthResponse {
    /** False when the account has two-factor enabled and still needs the checkpoint. */
    complete: boolean;
    intended?: string;
    confirmationToken?: string;
}

const toAuthResponse = (data: { data?: Record<string, any> }): AuthResponse => ({
    complete: Boolean(data.data?.complete),
    intended: data.data?.intended || undefined,
    confirmationToken: data.data?.confirmation_token || undefined,
});

/** Refreshes the XSRF cookie before a state-changing auth request, as the legacy client did. */
const csrf = () => http.get('/sanctum/csrf-cookie');

export async function login(user: string, password: string, recaptcha?: string): Promise<AuthResponse> {
    await csrf();
    const { data } = await http.post('/auth/login', { user, password, 'g-recaptcha-response': recaptcha });

    return toAuthResponse(data);
}

/** Exactly one of `code` (TOTP) or `recoveryToken` is used; the backend prefers the recovery token. */
export async function checkpoint(confirmationToken: string, code: string, recoveryToken?: string): Promise<AuthResponse> {
    const { data } = await http.post('/auth/login/checkpoint', {
        confirmation_token: confirmationToken,
        authentication_code: code,
        recovery_token: recoveryToken || undefined,
    });

    return toAuthResponse(data);
}

/**
 * Usernameless passkey sign-in: the options carry no credential list, so the browser picks
 * the account from the discoverable credential it holds.
 */
export async function passkeyLogin(): Promise<AuthResponse> {
    await csrf();
    const { data: options } = await http.post('/auth/passkey/options');
    const credential = await startAuthentication({ optionsJSON: options });
    const { data } = await http.post('/auth/passkey/login', { credential });

    return toAuthResponse(data);
}

export const passkeysSupported = () => typeof window.PublicKeyCredential !== 'undefined';

/** Dismissing the OS prompt rejects the ceremony; that is not an error worth showing. */
export const isPasskeyCancellation = (error: unknown) => error instanceof Error && ['NotAllowedError', 'AbortError'].includes(error.name);

/** Returns the provider's authorisation URL to send the browser to. */
export async function externalLogin(provider: 'discord' | 'google', recaptcha?: string): Promise<string> {
    await csrf();
    const { data } = await http.post(`/auth/modules/${provider}`, { 'g-recaptcha-response': recaptcha });

    return data;
}

export interface RegisterValues {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
}

export async function register(values: RegisterValues, recaptcha?: string): Promise<void> {
    await csrf();
    await http.post('/auth/register', { ...values, 'g-recaptcha-response': recaptcha });
}

/**
 * Sets a new password with the account recovery code given at sign-up. Signs the user in
 * unless the account has two-factor enabled, in which case `complete` is false.
 */
export async function resetWithRecoveryCode(
    values: { email: string; code: string; password: string; password_confirm: string },
    recaptcha?: string,
): Promise<AuthResponse> {
    await csrf();
    const { data } = await http.post('/auth/password', { ...values, 'g-recaptcha-response': recaptcha });

    return toAuthResponse(data);
}

/** Completes a reset from an emailed link (`/auth/password/reset/:token?email=`). */
export async function resetWithToken(values: { email: string; token: string; password: string; password_confirmation: string }): Promise<{
    redirectTo: string;
    sendToLogin: boolean;
}> {
    const { data } = await http.post('/auth/password/reset', values);

    return { redirectTo: data.redirect_to || '/', sendToLogin: Boolean(data.send_to_login) };
}

/**
 * Ends the session. A full page load afterwards is deliberate: it clears all in-memory
 * state and lets Laravel redirect to the login page.
 */
export async function logout(): Promise<void> {
    try {
        await http.post('/auth/logout');
    } finally {
        window.location.href = '/';
    }
}
