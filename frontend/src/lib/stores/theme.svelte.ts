import { app } from '$lib/stores/app.svelte';
import { DEFAULT_BRAND, normalizeBrand } from '$lib/theme/presets';

export type ColorScheme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'jexactyl:color-scheme';

/**
 * Light/dark handling and the brand colour.
 *
 * The colour scheme is a per-user client preference: it is kept in local storage and
 * follows the system setting when set to `system`. The brand colour is not: it is
 * the panel's, set by an administrator under /admin/theme and handed to the browser
 * in `window.ThemeConfiguration`. It is applied by writing `--brand` onto the
 * document element, and the accent tokens are derived from it in CSS.
 */
class ThemeState {
    #preference = $state<ColorScheme>('system');
    #systemDark = $state(false);
    #brand = $state(DEFAULT_BRAND);

    /** The scheme actually in effect once `system` is resolved. */
    readonly resolved = $derived<'light' | 'dark'>(
        this.#preference === 'system' ? (this.#systemDark ? 'dark' : 'light') : this.#preference,
    );

    get preference() {
        return this.#preference;
    }

    /** The brand colour, as `#rrggbb`. */
    get brand() {
        return this.#brand;
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

        // The server theme is read before the first paint as well, so that the page
        // does not flash the default brand colour while the bundle loads.
        const brand = normalizeBrand(app.theme?.colors?.primary);
        if (brand) this.#brand = brand;

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

    /**
     * Points the panel at another brand colour. Callers are responsible for storing
     * it; this only applies it, so the theme editor can show the colour it is about
     * to save without a round trip.
     */
    setBrand(hex: string) {
        const brand = normalizeBrand(hex);
        if (!brand) return;

        this.#brand = brand;
        this.applyBrand();
    }

    /** Writes the class the CSS tokens key off of. */
    apply() {
        document.documentElement.classList.toggle('dark', this.resolved === 'dark');
        document.documentElement.style.colorScheme = this.resolved;
        this.applyBrand();
    }

    /**
     * Writes the brand colour onto the document element. The tokens derive from it
     * in CSS, so this is the only thing that has to change when it changes.
     */
    applyBrand() {
        document.documentElement.style.setProperty('--brand', this.#brand);
    }
}

export const theme = new ThemeState();
