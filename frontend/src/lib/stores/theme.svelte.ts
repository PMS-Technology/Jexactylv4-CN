export type ColorScheme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'jexactyl:color-scheme';

/**
 * Light/dark handling.
 *
 * The panel also has a server-side theme (`window.ThemeConfiguration`) that admins edit
 * under /admin/theme; that one supplies brand colours and is applied separately. This
 * class only owns the light/dark scheme, which is a per-user client preference.
 */
class ThemeState {
    #preference = $state<ColorScheme>('system');
    #systemDark = $state(false);

    /** The scheme actually in effect once `system` is resolved. */
    readonly resolved = $derived<'light' | 'dark'>(
        this.#preference === 'system' ? (this.#systemDark ? 'dark' : 'light') : this.#preference,
    );

    get preference() {
        return this.#preference;
    }

    init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            this.#preference = stored;
        }

        const query = window.matchMedia('(prefers-color-scheme: dark)');
        this.#systemDark = query.matches;
        query.addEventListener('change', e => {
            this.#systemDark = e.matches;
        });

        this.apply();
    }

    set(preference: ColorScheme) {
        this.#preference = preference;
        localStorage.setItem(STORAGE_KEY, preference);
        this.apply();
    }

    toggle() {
        this.set(this.resolved === 'dark' ? 'light' : 'dark');
    }

    /** Writes the class the CSS tokens key off of. */
    apply() {
        document.documentElement.classList.toggle('dark', this.resolved === 'dark');
        document.documentElement.style.colorScheme = this.resolved;
    }
}

export const theme = new ThemeState();
