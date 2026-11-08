import { startRegistration } from '@simplewebauthn/browser';
import http, { type FractalResponseData, type FractalResponseList } from '$lib/api/http';
import type { ApiKey, Passkey, SSHKey, TwoFactorTokenData } from '$lib/api/definitions/account';
import { toApiKey, toPasskey, toSSHKey } from '$lib/api/transformers/account';

/**
 * Credential endpoints under `/api/client/account`, ported from
 * `api/routes/account/{two-factor,passkeys,ssh-keys,api-keys}.ts`.
 */

export const securityKeys = {
    apiKeys: ['account', 'api-keys'] as const,
    sshKeys: ['account', 'ssh-keys'] as const,
    passkeys: ['account', 'passkeys'] as const,
};

// Two-factor -----------------------------------------------------------------------

/** Generates a fresh TOTP secret. The backend rejects this once 2FA is already enabled. */
export async function getTwoFactorTokenData(): Promise<TwoFactorTokenData> {
    const { data } = await http.get('/api/client/account/two-factor');

    return data.data;
}

/** Enables TOTP and returns the one-time recovery tokens. */
export async function enableTwoFactor(code: string, password: string): Promise<string[]> {
    const { data } = await http.post('/api/client/account/two-factor', { code, password });

    return data.attributes.tokens;
}

export async function disableTwoFactor(password: string): Promise<void> {
    await http.post('/api/client/account/two-factor/disable', { password });
}

// API keys -------------------------------------------------------------------------

export async function getApiKeys(): Promise<ApiKey[]> {
    const { data } = await http.get('/api/client/account/api-keys');

    return ((data as FractalResponseList).data ?? []).map(toApiKey);
}

/**
 * Creates a key. The secret is only returned on creation; the full token the user needs
 * is the identifier followed by the secret, as the legacy modal showed it.
 */
export async function createApiKey(description: string, allowedIps: string[]): Promise<ApiKey & { token: string }> {
    const { data } = await http.post('/api/client/account/api-keys', {
        description,
        allowed_ips: allowedIps,
    });

    const key = toApiKey(data as FractalResponseData);

    return { ...key, token: `${key.identifier}${data.meta?.secret_token ?? ''}` };
}

export async function deleteApiKey(identifier: string): Promise<void> {
    await http.delete(`/api/client/account/api-keys/${encodeURIComponent(identifier)}`);
}

// SSH keys -------------------------------------------------------------------------

export async function getSSHKeys(): Promise<SSHKey[]> {
    const { data } = await http.get('/api/client/account/ssh-keys');

    return (data as FractalResponseList).data.map(toSSHKey);
}

export async function createSSHKey(name: string, publicKey: string): Promise<SSHKey> {
    const { data } = await http.post('/api/client/account/ssh-keys', { name, public_key: publicKey });

    return toSSHKey(data);
}

export async function deleteSSHKey(fingerprint: string): Promise<void> {
    await http.post('/api/client/account/ssh-keys/remove', { fingerprint });
}

// Passkeys -------------------------------------------------------------------------

export async function getPasskeys(): Promise<Passkey[]> {
    const { data } = await http.get('/api/client/account/passkeys');

    return (data as FractalResponseList).data.map(toPasskey);
}

/**
 * Runs a full registration ceremony: ask the Panel for options, hand them to the browser so
 * the user can satisfy their authenticator, then send the result back to be verified.
 *
 * The password is confirmed while fetching the options, so a wrong one fails before the user
 * is prompted by their authenticator. SSO-only accounts have no password and omit it.
 */
export async function createPasskey(name: string, password?: string): Promise<Passkey> {
    const { data: options } = await http.post('/api/client/account/passkeys/options', { password });
    const credential = await startRegistration({ optionsJSON: options });

    const { data } = await http.post('/api/client/account/passkeys', { name, credential });

    return toPasskey(data);
}

export async function deletePasskey(uuid: string, password?: string): Promise<void> {
    await http.post('/api/client/account/passkeys/remove', { uuid, password });
}

/** False on insecure origins and older browsers, where WebAuthn cannot run at all. */
export function passkeysSupported(): boolean {
    return typeof window.PublicKeyCredential !== 'undefined';
}

/** Dismissing the OS prompt rejects the ceremony; that is a user choice, not an error. */
export function isPasskeyCancellation(error: unknown): boolean {
    return error instanceof Error && ['NotAllowedError', 'AbortError'].includes(error.name);
}
