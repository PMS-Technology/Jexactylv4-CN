import http from '$lib/api/http';

/**
 * Admin authentication module endpoints, ported from `api/routes/admin/auth.ts`.
 * Every setting lands in `settings::modules:auth:<module>:<key>`.
 */

export type AuthModuleName = 'onboarding' | 'jguard' | 'discord' | 'google';

/** Settings that are not add-on modules but share the same update endpoint. */
export type AuthSettingGroup = AuthModuleName | 'registration' | 'security';

/**
 * Enables or disables an add-on module. ModuleController reads the name from
 * `$request->all()[0]`, so the body must be the bare JSON string `"jguard"`, not an
 * object. With the JSON content type set on the shared client, axios encodes a string
 * payload exactly that way (checked against axios 1.14 and a Laravel request).
 */
export async function setAuthModule(name: AuthModuleName, enabled: boolean): Promise<void> {
    await http.post(`/api/application/auth/modules/${enabled ? 'enable' : 'disable'}`, name);
}

/**
 * Stores one value. The request has no validation rules, so callers check their input.
 * Booleans are stored as "1" / "" and read back through SettingsServiceProvider.
 */
export async function updateAuthSetting(group: AuthSettingGroup, key: string, value: string | number | boolean): Promise<void> {
    await http.put('/api/application/auth/modules', { module: group, key, value });
}
