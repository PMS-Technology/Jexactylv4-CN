<script lang="ts">
    import { LayoutDashboard, Puzzle } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { navigableRoutes } from '$lib/router/types';
    import type { CustomLink } from '$lib/api/links';
    import MobileNav from '$lib/components/mobile-nav/MobileNav.svelte';
    import MobileNavItem from '$lib/components/mobile-nav/MobileNavItem.svelte';
    import accountRoutes from './routes';

    /**
     * Phone menu for the dashboard: the same pages as the desktop sidebar, plus the
     * admin-configured links. The admin area is reached from the first capsule.
     */
    let { links = [] }: { links?: CustomLink[] } = $props();

    const navItems = $derived(app.flags ? navigableRoutes(accountRoutes, app.flags) : []);
</script>

<MobileNav area="dashboard" scope="全部服务器" {links}>
    {#snippet primary()}
        <MobileNavItem href="/" end label="控制台" icon={LayoutDashboard} />
        {#each navItems as item (item.path)}
            <MobileNavItem
                href={item.path ? `/account/${item.path}` : '/account'}
                end={item.end}
                label={item.name ?? ''}
                icon={item.icon ?? Puzzle}
            />
        {/each}
    {/snippet}
</MobileNav>
