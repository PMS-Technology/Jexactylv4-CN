import type { Component } from 'svelte';

/**
 * Egg feature modals, ported from `components/server/features/index.ts`. Keys are the
 * values an egg lists in `features`; each loads as its own chunk, only for servers whose
 * egg enables it. Every component takes `{ store }`.
 */
const features: Record<string, () => Promise<{ default: Component<any> }>> = {
    eula: () => import('./EulaFeature.svelte'),
    java_version: () => import('./JavaVersionFeature.svelte'),
    gsl_token: () => import('./GslTokenFeature.svelte'),
    pid_limit: () => import('./PidLimitFeature.svelte'),
    steam_disk_space: () => import('./SteamDiskSpaceFeature.svelte'),
    hytale_oauth: () => import('./HytaleOauthFeature.svelte'),
};

export default features;

/** Case-insensitive substring match against a console line, as every legacy feature did. */
export function lineMatches(line: string, patterns: string[]): boolean {
    const lower = line.toLowerCase();

    return patterns.some(p => lower.includes(p.toLowerCase()));
}
