<script lang="ts">
    import { matchRoutes } from '$lib/router/match';
    import RouteView from '$lib/router/RouteView.svelte';
    import type { ServerRouteDefinition } from '$lib/router/types';
    import { route } from '$lib/router/types';
    import Alert from '$lib/components/Alert.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';

    /**
     * Router for the `schedules/*` mount, ported from `resources/scripts/components/server/schedules/*`.
     * Matches '' → list page and ':id' → detail page. The `rest` parameter is the remainder of
     * the path after `/server/:id/schedules`.
     */
    let { store, rest = '' }: { store: ServerStore; rest?: string } = $props();

    const routes: ServerRouteDefinition[] = [
        route('', () => import('./SchedulesPage.svelte'), { permission: 'schedule.*' }),
        route(':id', () => import('./ScheduleDetailPage.svelte'), { permission: 'schedule.*' }),
    ];

    const match = $derived(matchRoutes(routes, rest === '' ? '/' : `/${rest.replace(/^\/+/, '')}`));
</script>

{#if match}
    <RouteView load={match.route.component} props={{ params: match.params, rest: match.rest, store }} />
{:else}
    <div class="p-6">
        <Alert variant="destructive" title="无法访问">计划任务路径无效。</Alert>
    </div>
{/if}
