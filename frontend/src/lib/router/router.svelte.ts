import { matchRoutes, type RankedMatch } from './match';

/**
 * Client-side router state, backed by the History API.
 *
 * Laravel's catch-all (`routes/base.php`) serves the same HTML for any non-API path,
 * which is what makes deep links and hard refreshes work without a fallback rewrite
 * rule — the SPA reads the current path out of `location` on boot.
 */
class RouterState {
    #pathname = $state(window.location.pathname);
    #search = $state(window.location.search);
    #hash = $state(window.location.hash);

    constructor() {
        window.addEventListener('popstate', this.#sync);
    }

    #sync = () => {
        this.#pathname = window.location.pathname;
        this.#search = window.location.search;
        this.#hash = window.location.hash;
    };

    get pathname() {
        return this.#pathname;
    }

    get search() {
        return this.#search;
    }

    get hash() {
        return this.#hash;
    }

    get query(): URLSearchParams {
        return new URLSearchParams(this.#search);
    }

    #documentPaths: ((pathname: string) => boolean) | null = null;

    /**
     * Registers paths that the other bundle serves. Navigating to one does a document
     * load instead of a pushState: pushing first and reloading afterwards makes the
     * browser treat the load as a replace of the pushed entry, which leaves the back
     * button returning to the wrong document.
     */
    setDocumentPaths(predicate: ((pathname: string) => boolean) | null) {
        this.#documentPaths = predicate;
    }

    /** Pushes a new entry and scrolls to the top, as a fresh page navigation would. */
    navigate(to: string, { replace = false, scroll = true }: { replace?: boolean; scroll?: boolean } = {}) {
        const url = new URL(to, window.location.origin);

        if (url.origin !== window.location.origin || this.#documentPaths?.(url.pathname)) {
            window.location[replace ? 'replace' : 'assign'](url.href);

            return;
        }

        if (url.pathname === this.#pathname && url.search === this.#search && url.hash === this.#hash) {
            return;
        }

        window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
        this.#sync();

        if (scroll && !url.hash) {
            window.scrollTo({ top: 0 });
        }
    }

    back() {
        window.history.back();
    }

    /** True when `path` is the current page, used for navigation active states. */
    isActive(path: string, end = false): boolean {
        const current = this.#pathname.replace(/\/+$/, '') || '/';
        const target = path.replace(/\/+$/, '') || '/';

        if (end || target === '/') return current === target;

        return current === target || current.startsWith(`${target}/`);
    }
}

export const router = new RouterState();

export function navigate(to: string, opts?: { replace?: boolean; scroll?: boolean }) {
    router.navigate(to, opts);
}

/**
 * Resolves the active route for a set of definitions against the current pathname.
 * Pass `basePath` when the definitions are relative to a mounted prefix such as
 * `/server/:id` so matching happens against the remaining portion of the path.
 */
export function resolveRoute<T extends { route: string; end?: boolean }>(
    routes: T[],
    pathname: string,
    basePath = '',
): RankedMatch<T> | null {
    let relative = pathname;

    if (basePath) {
        const prefix = basePath.replace(/\/+$/, '');
        if (!relative.startsWith(prefix)) return null;
        relative = relative.slice(prefix.length) || '/';
    }

    return matchRoutes(routes, relative);
}
