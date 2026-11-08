import type { Component } from 'svelte';
import type { EverestSettings } from '$types/bootstrap';
import { normalizePattern } from './match';

/**
 * Route definitions mirror the legacy `routers/routes/*.ts` tables: a single data
 * structure drives both the router and the navigation sidebar, including the
 * permission gate and feature-flag condition for each entry.
 */

export type LazyComponent = () => Promise<{ default: Component<any> }>;

export interface RouteDefinition {
    /** Match pattern, e.g. `files/*` or `schedules/:id/*`. */
    route: string;
    /** Static path used for links, derived from `route` when not given. */
    path: string;
    /** Sidebar label. Entries without a name stay out of the navigation. */
    name?: string;
    component: LazyComponent;
    /** Index routes must consume the whole path. */
    end?: boolean;
    icon?: Component<any>;
    /** Hides the route when the feature flag is off. */
    condition?: (flags: EverestSettings) => boolean;
    /** Redirect target; when set the route navigates instead of rendering. */
    redirectTo?: string;
    /** Forces a document load for the redirect, for targets the legacy bundle serves. */
    redirectExternal?: boolean;
}

/** Per-server flags the legacy server table gated on, in place of the global feature flags. */
export interface ServerRouteFlags {
    billable: boolean;
    activityEnabled: boolean;
}

export interface ServerRouteDefinition extends Omit<RouteDefinition, 'condition'> {
    condition?: (flags: ServerRouteFlags) => boolean;
    category?: 'general' | 'data' | 'configuration' | null;
    /** Subuser permission key, e.g. `file.*`. Checked against the server permissions. */
    permission?: string | string[];
}

/** Flags the legacy admin table gated on. */
export interface AdminRouteFlags {
    activityEnabled: boolean;
}

export interface AdminRouteDefinition extends Omit<RouteDefinition, 'condition'> {
    condition?: (flags: AdminRouteFlags) => boolean;
    category?: 'general' | 'modules' | 'appearance' | 'management' | 'services';
    advanced?: boolean;
    /** Admin permission key, e.g. `nodes.read`. */
    permission?: string | string[];
    /**
     * Not ported yet: the page is still served by the legacy bundle, so visiting it
     * forces a document load and Laravel renders the Preact shell for that path.
     */
    legacy?: boolean;
}

type AnyRoute = RouteDefinition | ServerRouteDefinition | AdminRouteDefinition;

/** Declares a route, deriving `path` from the pattern when it is not supplied. */
export function route<T extends AnyRoute = RouteDefinition>(
    pattern: string,
    component: LazyComponent,
    opts: Partial<Omit<T, 'route' | 'component'>> = {},
): T {
    return {
        route: pattern,
        path: opts.path ?? normalizePattern(pattern),
        component,
        ...opts,
    } as T;
}

/**
 * Declares a route that sends visitors elsewhere, for pages that have moved.
 *
 * `external` forces a full page load instead of a client-side navigation, which is
 * required when the destination is still rendered by the legacy bundle.
 */
export function redirect(pattern: string, to: string, external = false): RouteDefinition {
    return {
        route: pattern,
        path: normalizePattern(pattern),
        component: async () => ({ default: (() => null) as unknown as Component<any> }),
        redirectTo: to,
        redirectExternal: external,
    };
}

/** Filters routes by the feature flags, matching the legacy `condition` behaviour. */
export function visibleRoutes<T extends RouteDefinition>(routes: T[], flags: EverestSettings): T[] {
    return routes.filter(r => !r.condition || r.condition(flags));
}

/** Routes that should appear in navigation: named, and not gated off by a flag. */
export function navigableRoutes<T extends RouteDefinition>(routes: T[], flags: EverestSettings): T[] {
    return routes.filter(r => r.name && (!r.condition || r.condition(flags)));
}
