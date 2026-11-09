/**
 * Types for the four globals that resources/views/templates/wrapper.blade.php injects
 * into the document head before the bundle loads. These are a backend contract — the
 * shapes mirror `Auth::user()->toReactObject()` and the `$siteConfiguration`,
 * `$everestConfiguration` and `$themeConfiguration` view arrays. Do not change them
 * without changing the corresponding Blade/PHP side.
 */

/** Raw shape of `window.PterodactylUser`, snake_cased as PHP emits it. */
export interface RawUser {
    uuid: string;
    username: string;
    email: string;
    root_admin: boolean;
    use_totp: boolean;
    language: string;
    avatar_url: string | null;
    admin_role_name: string;
    admin_role_id?: number;
    admin_permissions: string[];
    has_password: boolean;
    state: string;
    updated_at: string;
    created_at: string;
}

/** Camel-cased user used throughout the application. */
export interface User {
    uuid: string;
    username: string;
    email: string;
    language: string;
    rootAdmin: boolean;
    useTotp: boolean;
    hasPassword: boolean;
    avatarUrl: string | null;
    roleName: string;
    adminRoleId: number | undefined;
    adminPermissions: string[];
    state: string;
    createdAt: Date;
    updatedAt: Date;
}

export type PanelMode = 'standard' | 'personal' | undefined;

export interface SiteSettings {
    name: string;
    logo: string | null;
    mode: PanelMode;
    debug: boolean;
    locale: string;
    auto_update: boolean;
    indicators: boolean;
    speed_dial: boolean;
    setup: boolean;
    recaptcha: {
        enabled: boolean;
        siteKey: string;
    };
    activity: {
        enabled: {
            account: boolean;
            server: boolean;
            admin: boolean;
        };
    };
}

export type AlertType = 'success' | 'warning' | 'danger' | 'info';
export type AlertPosition = 'top-center' | 'bottom-right' | 'bottom-left' | 'center';

/** Feature flags. Route tables gate entries on these, so they must be read synchronously. */
export interface EverestSettings {
    auth: {
        registration: { enabled: boolean };
        security: { force2fa: boolean; attempts: number };
        modules: {
            jguard: { enabled: boolean; delay?: number; sensitivity?: 'low' | 'medium' | 'high' };
            discord: { enabled: boolean; clientId: boolean; clientSecret: boolean };
            google: { enabled: boolean; clientId: boolean; clientSecret: boolean };
            onboarding: { enabled: boolean; content?: string };
        };
    };
    tickets: { enabled: boolean; maxCount: number };
    billing: {
        enabled: boolean;
        keys: { secret: boolean };
        currency: { symbol: string; code: string };
        links: { terms: string; privacy: string };
        renewal: { days: number; threshold: number };
        allow_upgrades: boolean;
    };
    alert: {
        enabled: boolean;
        type: AlertType;
        position: AlertPosition;
        content: string;
        uuid: string;
    };
    ai: {
        enabled: boolean;
        key: boolean | string;
        user_access: boolean;
        provider: string;
        model: string;
        base_url: string;
        headers: boolean;
        max_tokens: number;
        temperature: number;
    };
    webhooks: { enabled: boolean; url: boolean };
}

export interface SiteTheme {
    colors: {
        headers: string;
        sidebar: string;
        background: string;
        primary?: string;
        secondary?: string;
    };
}

declare global {
    interface Window {
        PterodactylUser?: RawUser;
        SiteConfiguration?: SiteSettings;
        EverestConfiguration?: EverestSettings;
        ThemeConfiguration?: SiteTheme;
    }
}

/** Normalises the injected user payload into the camel-cased form used internally. */
export function transformUser(raw: RawUser): User {
    return {
        uuid: raw.uuid,
        username: raw.username,
        email: raw.email,
        language: raw.language,
        rootAdmin: raw.root_admin,
        useTotp: raw.use_totp,
        hasPassword: raw.has_password ?? true,
        avatarUrl: raw.avatar_url,
        roleName: raw.admin_role_name,
        adminRoleId: raw.admin_role_id,
        adminPermissions: raw.admin_permissions ?? [],
        state: raw.state,
        createdAt: new Date(raw.created_at),
        updatedAt: new Date(raw.updated_at),
    };
}
