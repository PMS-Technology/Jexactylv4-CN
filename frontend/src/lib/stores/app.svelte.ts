import {
    transformUser,
    type EverestSettings,
    type SiteSettings,
    type SiteTheme,
    type User,
} from '$types/bootstrap';
import { hasAdminPermission } from '$lib/utils/permissions';

/**
 * Application state read from the globals Blade injects.
 *
 * The legacy app did this in `components/App.tsx` on first render and stored it in an
 * easy-peasy store; the data is available synchronously before the bundle runs, which
 * is what lets the route tables evaluate feature flags without a loading state.
 */
class AppState {
    user = $state<User | null>(null);
    settings = $state<SiteSettings | null>(null);
    flags = $state<EverestSettings | null>(null);
    theme = $state<SiteTheme | null>(null);

    /** True once the bootstrap globals have been read. */
    initialized = $state(false);

    hydrate() {
        const { PterodactylUser, SiteConfiguration, EverestConfiguration, ThemeConfiguration } = window;

        if (PterodactylUser) {
            this.user = transformUser(PterodactylUser);
        }

        this.settings = SiteConfiguration ?? null;
        this.flags = EverestConfiguration ?? null;
        this.theme = ThemeConfiguration ?? null;
        this.initialized = true;
    }

    /** Whether the account can reach the admin area at all. */
    readonly isAdmin = $derived(Boolean(this.user?.rootAdmin || this.user?.adminRoleId));

    readonly isSuspended = $derived(this.user?.state === 'suspended');

    /**
     * Accounts created through SSO before onboarding get a placeholder username; the
     * legacy App.tsx routes them into the onboarding flow on this same check.
     */
    readonly needsOnboarding = $derived(
        Boolean(this.user?.username.startsWith('null_user_') && this.flags?.auth.modules.onboarding.enabled),
    );

    /** A root admin on a panel that has not completed setup goes to the install wizard. */
    readonly needsSetup = $derived(Boolean(this.user?.rootAdmin && this.settings && !this.settings.setup));

    /** Checks an admin permission key such as `nodes.read` or `users.*`. */
    can(permission?: string | string[]): boolean {
        if (!permission) return true;
        if (this.user?.rootAdmin) return true;

        return hasAdminPermission(this.user?.adminPermissions ?? [], permission);
    }

    updateUser(patch: Partial<User>) {
        if (!this.user) return;
        this.user = { ...this.user, ...patch };
    }

    updateSettings(patch: Partial<SiteSettings>) {
        if (!this.settings) return;
        this.settings = { ...this.settings, ...patch };
    }

    updateFlags(patch: Partial<EverestSettings>) {
        if (!this.flags) return;
        this.flags = { ...this.flags, ...patch };
    }
}

export const app = new AppState();
