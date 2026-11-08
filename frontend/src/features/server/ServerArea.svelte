<script lang="ts">
    import { CircleStop, ExternalLink, LayoutDashboard, Puzzle } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { resolveRoute, router } from '$lib/router/router.svelte';
    import RouteView from '$lib/router/RouteView.svelte';
    import { provideServerStore, websocketEvent, type ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent } from '$lib/api/definitions/events';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import ConflictState from './ConflictState.svelte';
    import ServerSuspended from './billing/ServerSuspended.svelte';
    import StatusControls from './console/StatusControls.svelte';
    import serverRoutes, { categoryLabels, serverRouteCategories } from './routes';

    let { id }: { id: string } = $props();

    /**
     * Fresh state per server, exactly like the legacy ServerContext.Provider: the store
     * owns the server object, permissions, live status and the socket. Keying the outer
     * element on the identifier re-runs this whole subtree when navigating between
     * servers, which is what clearServerState achieved on unmount.
     */
    const store: ServerStore = provideServerStore(id);

    const activityEnabled = $derived(Boolean(app.settings?.activity.enabled.server));
    const billable = $derived(Boolean(store.server?.billingProductId));

    // The legacy table gates on { billable, activityEnabled }; ported verbatim.
    const visible = $derived(serverRoutes.filter(r => !r.condition || r.condition({ billable, activityEnabled })));

    const isIndex = $derived(router.pathname.replace(/\/+$/, '') === `/server/${id}`);
    const match = $derived(resolveRoute(visible, router.pathname, `/server/${id}`));

    const topRoutes = $derived(visible.filter(r => !r.category && r.name));
    const byCategory = $derived.by(() => {
        const groups: Record<string, typeof visible> = {};
        for (const category of serverRouteCategories) {
            groups[category] = visible.filter(r => r.category === category && r.name);
        }

        return groups as Record<(typeof serverRouteCategories)[number], typeof visible>;
    });

    // Root admins can work on a conflicted server from the console root, like the legacy
    // pathname.endsWith check allowed.
    const showConflict = $derived(
        store.inConflictState && (!app.user?.rootAdmin || !isIndex),
    );

    // A billable server past its renewal date is locked behind the renewal screen.
    const renewalOverdue = $derived(
        Boolean(
            store.server?.billingProductId &&
                store.server?.renewalDate &&
                store.server.renewalDate.getTime() < Date.now(),
        ),
    );

    // InstallListener: install state changes arrive over the socket and flip the local
    // server object so the conflict screen and banners update without a manual refresh.
    websocketEvent(store, SocketEvent.INSTALL_STARTED, () => {
        store.patchServer({ status: 'installing' });
    });
    websocketEvent(store, SocketEvent.INSTALL_COMPLETED, () => {
        void store.refetch();
    });
    websocketEvent(store, SocketEvent.BACKUP_RESTORE_COMPLETED, () => {
        store.patchServer({ status: null });
    });

    // TransferListener.
    websocketEvent(store, SocketEvent.TRANSFER_STATUS, (status: string) => {
        if (status === 'pending' || status === 'processing') {
            store.patchServer({ isTransferring: true });
        } else if (status === 'failed') {
            store.patchServer({ isTransferring: false });
        } else if (status === 'completed') {
            void store.refetch();
        }
    });

    let destroyed = false;

    $effect(() => {
        void store.load().then(() => {
            if (destroyed || !store.server) return;
            // Conflict states (installing, suspended, transferring) have no console to
            // attach to; the socket is opened once the server is usable.
            if (!store.inConflictState) {
                store.connect();
            }
        });

        return () => {
            destroyed = true;
            store.destroy();
        };
    });
</script>

{#snippet navItems()}
    {#each topRoutes as item (item.route)}
        {@const Icon = item.icon ?? Puzzle}
        <Link
            href={item.path ? `/server/${id}/${item.path}` : `/server/${id}`}
            end={item.end}
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            activeClass="bg-accent font-medium text-accent-foreground"
        >
            <Icon class="size-4 shrink-0" />
            <span>{item.name}</span>
        </Link>
    {/each}

    {#each serverRouteCategories as category (category)}
        {#if byCategory[category].length}
            <p class="px-3 pt-4 pb-1 text-2xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
                {categoryLabels[category]}
            </p>
            {#each byCategory[category] as item (item.route)}
                {@const Icon = item.icon ?? Puzzle}
                <Link
                    href={`/server/${id}/${item.path}`}
                    class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    activeClass="bg-accent font-medium text-accent-foreground"
                >
                    <Icon class="size-4 shrink-0" />
                    <span>{item.name}</span>
                </Link>
            {/each}
        {/if}
    {/each}
{/snippet}

<div class="flex min-h-screen">
    <aside
        class="hidden w-60 flex-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
    >
        <div class="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
            <Link
                href="/"
                class="flex min-w-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <LayoutDashboard class="size-4 shrink-0" />
                <span class="truncate">{app.settings?.name ?? 'Panel'}</span>
            </Link>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin" aria-label="Server">
            <p class="truncate px-3 pt-1 pb-2 font-mono text-2xs text-muted-foreground/70" title={store.server?.uuid}>
                {store.server?.uuid.slice(0, 8) ?? id}
            </p>
            {@render navItems()}

            {#if app.user?.rootAdmin && store.server}
                <a
                    href="/admin/servers/{store.server.internalId}"
                    class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                    <ExternalLink class="size-4 shrink-0" />
                    <span>管理员视角</span>
                </a>
            {/if}
        </nav>

        <div class="border-t border-sidebar-border p-3">
            <StatusControls {store} />
        </div>
    </aside>

    <main class="min-w-0 flex-1 pb-16 md:pb-0">
        {#if store.loadError}
            <div class="p-6">
                <Alert variant="destructive" title="无法加载服务器">{store.loadError}</Alert>
            </div>
        {:else if !store.server}
            <Spinner centered />
        {:else if renewalOverdue}
            <ServerSuspended {store} />
        {:else}
            {#if store.banner}
                <div class="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground">
                    {#if store.banner === 'connecting'}
                        <Spinner size="sm" />
                        <span>正在连接到你的服务器，请稍候……</span>
                    {:else}
                        <span>{store.banner}</span>
                    {/if}
                </div>
            {/if}

            {#if showConflict}
                <ConflictState {store} />
            {:else if match}
                {#if match.route.permission && !store.can(match.route.permission)}
                    <div class="p-6">
                        <Alert variant="destructive" title="没有访问权限">你没有权限访问此页面。</Alert>
                    </div>
                {:else}
                    {#key match.route.route}
                        <RouteView
                            load={match.route.component}
                            props={{ params: match.params, rest: match.rest, store }}
                        />
                    {/key}
                {/if}
            {:else if isIndex && serverRoutes[0]}
                <!-- resolveRoute returns null only for the index when the table has one; guard anyway. -->
                <RouteView load={serverRoutes[0].component} props={{ params: {}, rest: '', store }} />
            {:else}
                <NotFound backTo="/server/{id}" />
            {/if}
        {/if}
    </main>

    <!-- Mobile: same list as the desktop sidebar. -->
    <nav
        aria-label="Server"
        class="fixed inset-x-0 bottom-0 z-40 h-16 rounded-t-2xl border-t border-sidebar-border
               bg-sidebar/90 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md md:hidden"
    >
        <div class="flex h-full items-center gap-4 overflow-x-auto px-4 scrollbar-thin">
            <Link
                href="/"
                end
                class="flex shrink-0 items-center gap-2 text-sm font-medium text-sidebar-foreground/80 transition-transform duration-200 hover:text-sidebar-foreground active:scale-90"
            >
                <LayoutDashboard class="size-5 shrink-0" />
                <span class="sr-only">控制台</span>
            </Link>
            <span aria-hidden="true" class="shrink-0 text-muted-foreground/50">&bull;</span>
            {#each visible.filter(r => r.name) as item (item.route)}
                {@const Icon = item.icon ?? Puzzle}
                <Link
                    href={item.path ? `/server/${id}/${item.path}` : `/server/${id}`}
                    end={item.end}
                    class="flex shrink-0 items-center gap-2 text-sm font-medium text-sidebar-foreground/80 transition-transform duration-200 hover:text-sidebar-foreground active:scale-90"
                    activeClass="text-primary scale-105"
                >
                    <Icon class="size-4 shrink-0" />
                    <span class="whitespace-nowrap">{item.name}</span>
                </Link>
            {/each}
            {#if app.user?.rootAdmin && store.server}
                <a
                    href="/admin/servers/{store.server.internalId}"
                    class="flex shrink-0 items-center gap-2 text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground"
                >
                    <CircleStop class="size-4 shrink-0" />
                    <span class="whitespace-nowrap">管理员</span>
                </a>
            {/if}
        </div>
    </nav>
</div>
