<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { app } from '$lib/stores/app.svelte';
    import { resolveRoute, router } from '$lib/router/router.svelte';
    import RouteView from '$lib/router/RouteView.svelte';
    import { visibleRoutes } from '$lib/router/types';
    import { getLinks } from '$lib/api/links';
    import Sidebar from './Sidebar.svelte';
    import MobileSidebar from './MobileSidebar.svelte';
    import DashboardAlert from './components/DashboardAlert.svelte';
    import SpeedDial from './components/SpeedDial.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import accountRoutes from './routes';
    import ServersPage from './pages/ServersPage.svelte';

    const linksQuery = createQuery(() => ({
        queryKey: ['links'],
        queryFn: getLinks,
        // Admin-managed and rarely changing; no need to refetch on every focus.
        staleTime: 10 * 60_000,
        refetchOnWindowFocus: false,
    }));

    const routes = $derived(app.flags ? visibleRoutes(accountRoutes, app.flags) : []);

    // The dashboard index lives at `/`, while the account pages are mounted under
    // `/account`, matching the legacy URL layout.
    const isIndex = $derived(router.pathname.replace(/\/+$/, '') === '');
    const match = $derived(isIndex ? null : resolveRoute(routes, router.pathname, '/account'));
</script>

<div class="flex min-h-screen">
    <Sidebar links={linksQuery.data ?? []} />

    <main class="min-w-0 flex-1 pb-16 md:pb-0">
        <DashboardAlert />
        {#if isIndex}
            <ServersPage />
        {:else if match}
            {#key match.route.route}
                <RouteView
                    load={match.route.component}
                    redirectTo={match.route.redirectTo}
                    redirectExternal={match.route.redirectExternal}
                    props={{ params: match.params, rest: match.rest }}
                />
            {/key}
        {:else}
            <NotFound />
        {/if}
    </main>

    <MobileSidebar />

    {#if app.isAdmin && app.settings?.speed_dial}
        <SpeedDial />
    {/if}
</div>
