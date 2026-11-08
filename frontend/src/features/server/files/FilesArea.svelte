<script lang="ts">
    import { matchRoutes } from '$lib/router/match';
    import RouteView from '$lib/router/RouteView.svelte';
    import type { ServerRouteDefinition } from '$lib/router/types';
    import { route } from '$lib/router/types';
    import Alert from '$lib/components/Alert.svelte';
    import { provideFilesStore } from './files.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';

    /**
     * Router for the `files/*` mount, ported from the two legacy table entries:
     * the manager itself (`files/*`) and the editor (`files/:action/*`, more
     * specific, matched here so the action stays in one place). `rest` is the
     * remainder of the path after `/server/:id/files`.
     */
    let { store, rest = '' }: { store: ServerStore; rest?: string } = $props();

    // The editor needs the store too, so both branches share one context instance.
    // The id is the route param and never changes within one mount; reading it through
    // a plain property (instead of reactive access) is deliberate.
    provideFilesStore(store.server?.id ?? '');

    const routes: ServerRouteDefinition[] = [
        route('', () => import('./FileManagerPage.svelte'), { permission: 'file.*' }),
        route(':action/*', () => import('./FileEditorPage.svelte'), { permission: 'file.*' }),
    ];

    const match = $derived(matchRoutes(routes, rest === '' ? '/' : `/${rest.replace(/^\/+/, '')}`));
</script>

{#if match}
    <RouteView load={match.route.component} props={{ params: match.params, rest: match.rest, store }} />
{:else}
    <div class="p-6">
        <Alert variant="destructive" title="无法访问">文件路径无效。</Alert>
    </div>
{/if}
