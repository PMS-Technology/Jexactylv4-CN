<script lang="ts">
    import { CornerUpLeft, DollarSign, KeyRound, Puzzle, RefreshCw, Ticket } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { resolveRoute, router } from '$lib/router/router.svelte';
    import RouteView from '$lib/router/RouteView.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import Tooltip from '$lib/ui/tooltip/Tooltip.svelte';
    import MobileNav from '$lib/components/mobile-nav/MobileNav.svelte';
    import MobileNavItem from '$lib/components/mobile-nav/MobileNavItem.svelte';
    import MobileNavDivider from '$lib/components/mobile-nav/MobileNavDivider.svelte';
    import { animateRouteChange } from '$lib/motion';
    import adminRoutes, { adminCategoryLabels, adminRouteCategories } from './routes';

    /**
     * Admin shell, ported from AdminRouter.tsx: categorised sidebar filtered by feature
     * flag and admin permission, the module indicators, and the permission gate.
     */
    const activityEnabled = $derived(Boolean(app.settings?.activity.enabled.admin));
    const visible = $derived(adminRoutes.filter(r => !r.condition || r.condition({ activityEnabled })));
    const navigable = $derived(visible.filter(r => r.name && app.can(r.permission)));

    const match = $derived(resolveRoute(visible, router.pathname, '/admin'));

    // Links to legacy admin pages load the document directly (see setDocumentPaths), so
    // the Preact shell owns that history entry. Registered for the life of this area.
    $effect(() => {
        router.setDocumentPaths(pathname => {
            if (!/^\/admin(\/|$)/.test(pathname)) return false;

            return Boolean(resolveRoute(adminRoutes, pathname, '/admin')?.route.legacy);
        });

        return () => router.setDocumentPaths(null);
    });

    // The path this document was served for. Back/forward within this document can still
    // land on a legacy route (e.g. a hash change); reload in that case. If Laravel served
    // *this* shell for a legacy path (whitelist and route table out of sync), reloading
    // would loop, so that case shows a notice instead.
    const documentPath = window.location.pathname;
    const servedLegacyPath = $derived(Boolean(match?.route.legacy) && router.pathname === documentPath);

    $effect(() => {
        if (match?.route.legacy && router.pathname !== documentPath) {
            window.location.reload();
        }
    });

    const itemClass =
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
    const activeItemClass = 'bg-accent text-accent-foreground font-medium';

    const indicators = $derived(
        [
            app.settings?.auto_update && { text: '已启用自动更新', icon: RefreshCw },
            app.flags?.auth.registration.enabled && { text: '已开放用户注册', icon: KeyRound },
            app.flags?.billing.enabled && { text: '已启用计费模块', icon: DollarSign },
            app.flags?.tickets.enabled && { text: '已启用工单系统', icon: Ticket },
        ].filter(Boolean) as { text: string; icon: typeof RefreshCw }[],
    );

    // The content area settles in whenever the route changes.
    let main = $state<HTMLElement>();

    $effect(() => {
        const path = router.pathname;
        if (main) animateRouteChange(main, path);
    });
</script>

<div class="flex min-h-screen">
    <aside
        class="sticky top-0 hidden h-screen supports-[height:100dvh]:h-dvh w-60 flex-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
    >
        <div class="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
            <span class="truncate font-header text-base font-semibold">{app.settings?.name ?? 'Panel'}</span>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin" aria-label="Admin">
            <Link href="/" class={itemClass}>
                <CornerUpLeft class="size-4 shrink-0" />
                <span>返回</span>
            </Link>

            {#each adminRouteCategories as category (category)}
                {@const items = navigable.filter(r => r.category === category)}
                {#if items.length}
                    <p class="px-3 pt-4 pb-1 text-2xs font-semibold tracking-wide text-muted-foreground/70 uppercase">
                        {adminCategoryLabels[category]}
                    </p>
                    {#each items as item (item.route)}
                        {@const Icon = item.icon ?? Puzzle}
                        <Link
                            href={item.path ? `/admin/${item.path}` : '/admin'}
                            end={item.end}
                            class={itemClass}
                            activeClass={activeItemClass}
                        >
                            <Icon class="size-4 shrink-0" />
                            <span>{item.name}</span>
                        </Link>
                    {/each}
                {/if}
            {/each}
        </nav>

        <!-- Module indicators. The legacy panel floated these over the top-right corner,
             where they covered each page's header actions. -->
        {#if app.settings?.indicators && indicators.length}
            <div class="flex items-center gap-1.5 border-t border-sidebar-border px-3 py-2">
                {#each indicators as indicator (indicator.text)}
                    {@const Icon = indicator.icon}
                    <Tooltip content={indicator.text} side="top">
                        {#snippet child({ props })}
                            <span {...props} class="rounded-md bg-accent p-1.5 text-primary" aria-label={indicator.text}>
                                <Icon class="size-3.5" />
                            </span>
                        {/snippet}
                    </Tooltip>
                {/each}
            </div>
        {/if}

        <div class="flex items-center gap-3 border-t border-sidebar-border p-3">
            <Avatar src={app.user?.avatarUrl} name={app.user?.uuid ?? 'system'} size={36} class="shrink-0" />
            <div class="min-w-0 flex-1">
                <span class="inline-flex rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium">
                    {!app.user?.roleName || app.user.roleName === 'None' ? 'Root Admin' : app.user.roleName}
                </span>
                <p class="truncate text-sm" title={app.user?.email}>{app.user?.email}</p>
            </div>
            <ThemeToggle />
        </div>
    </aside>

    <main bind:this={main} class="min-w-0 flex-1">
        {#if servedLegacyPath}
            <div class="p-6">
                <Alert variant="warning" title="此页面尚未迁移">
                    Laravel 为这个路径返回了新前端，但该页面还没有移植。请检查
                    <code class="font-mono text-xs">Admin\BaseController</code> 的白名单。
                </Alert>
            </div>
        {:else if !match}
            <NotFound backTo="/admin" />
        {:else if match.route.legacy}
            <!-- The $effect above is reloading into the legacy shell. -->
        {:else if !app.can(match.route.permission)}
            <div class="p-6">
                <Alert variant="destructive" title="没有访问权限">你没有权限访问此页面。</Alert>
            </div>
        {:else}
            {#key match.route.route}
                <RouteView load={match.route.component} props={{ params: match.params, rest: match.rest }} />
            {/key}
        {/if}
    </main>

    <!-- Phone menu: the sidebar's categories, separated by hairlines as on Vercel. -->
    <MobileNav area="admin">
        {#snippet primary()}
            {#each adminRouteCategories.map(c => navigable.filter(r => r.category === c)).filter(g => g.length) as group, i (i)}
                {#if i > 0}<MobileNavDivider />{/if}
                {#each group as item (item.route)}
                    <MobileNavItem
                        href={item.path ? `/admin/${item.path}` : '/admin'}
                        end={item.end}
                        label={item.name ?? ''}
                        icon={item.icon ?? Puzzle}
                    />
                {/each}
            {/each}
        {/snippet}
    </MobileNav>

</div>
