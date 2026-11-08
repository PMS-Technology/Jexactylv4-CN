/**
 * Path matching for the client-side router.
 *
 * Patterns use the same syntax as the legacy react-router tables so the route
 * definitions could be ported across verbatim:
 *
 *   'files/*'          trailing wildcard, matches the segment and everything below it
 *   'schedules/:id/*'  named parameter followed by a wildcard
 *   'users/roles/:id'  named parameter
 *   ''                 index route
 */

export interface MatchResult {
    /** Values captured by `:name` segments. */
    params: Record<string, string>;
    /** Whatever a trailing `*` consumed, without a leading slash. */
    rest: string;
    /**
     * The static leading portion of the matched pattern, i.e. the pattern up to the
     * first `:` or `*` segment. Nested routes use this to decide whether a navigation
     * is "within" the same page, mirroring react-router's `pathnameBase`.
     */
    base: string;
}

const split = (path: string): string[] => path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

/** Strips parameter and wildcard segments, leaving the static prefix of a pattern. */
export function normalizePattern(pattern: string): string {
    return pattern.replace(/[:*].*$/, '').replace(/\/+$/, '');
}

/**
 * Attempts to match a pathname against a pattern. Returns null when it does not match.
 *
 * `end` controls whether leftover segments are allowed: an index route (`end: true`)
 * must consume the whole pathname, while a pattern ending in `*` always may.
 */
export function matchPath(pattern: string, pathname: string, end = false): MatchResult | null {
    const patternParts = split(pattern);
    const pathParts = split(pathname);
    const params: Record<string, string> = {};
    const consumed: string[] = [];

    for (let i = 0; i < patternParts.length; i++) {
        const segment = patternParts[i]!;

        if (segment === '*') {
            return {
                params,
                rest: pathParts.slice(i).join('/'),
                base: '/' + consumed.join('/'),
            };
        }

        const part = pathParts[i];
        if (part === undefined) return null;

        if (segment.startsWith(':')) {
            params[segment.slice(1)] = decodeURIComponent(part);
        } else if (segment !== part) {
            return null;
        } else {
            consumed.push(part);
        }
    }

    // Pattern ran out of segments. An exact route rejects anything left over; a prefix
    // route keeps the remainder so nested routers can match against it.
    if (pathParts.length > patternParts.length) {
        if (end) return null;

        return {
            params,
            rest: pathParts.slice(patternParts.length).join('/'),
            base: '/' + consumed.join('/'),
        };
    }

    return { params, rest: '', base: '/' + consumed.join('/') };
}

export interface RankedMatch<T> extends MatchResult {
    route: T;
}

/**
 * Picks the best match from a list of patterns.
 *
 * Specificity beats declaration order: static segments outrank parameters, which
 * outrank wildcards. Without this, `servers/new` would be shadowed by `servers/:id`
 * whenever the latter happened to be declared first.
 */
export function matchRoutes<T extends { route: string; end?: boolean }>(
    routes: T[],
    pathname: string,
): RankedMatch<T> | null {
    let best: { match: RankedMatch<T>; score: number } | null = null;

    for (const route of routes) {
        const match = matchPath(route.route, pathname, route.end ?? false);
        if (!match) continue;

        const score = split(route.route).reduce((total, segment) => {
            if (segment === '*') return total + 1;
            if (segment.startsWith(':')) return total + 10;

            return total + 100;
        }, 0);

        if (!best || score > best.score) {
            best = { match: { ...match, route }, score };
        }
    }

    return best?.match ?? null;
}
