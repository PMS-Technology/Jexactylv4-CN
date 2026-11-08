<script lang="ts">
    import { House as Home, Cog, Puzzle } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { navigableRoutes } from '$lib/router/types';
    import Link from '$lib/components/Link.svelte';
    import accountRoutes from './routes';
    import SearchContainer from './components/SearchContainer.svelte';

    /**
     * Bottom navigation bar for phones, ported from `elements/MobileSidebar.tsx`: the
     * desktop sidebar is hidden below `md`, so this bar carries the same route list.
     *
     * The legacy bar relies on the top NavigationBar for search; the new shell has no
     * top bar, so the search trigger lives here as well (`compact` renders an icon).
     */
    const navItems = $derived(app.flags ? navigableRoutes(accountRoutes, app.flags) : []);

    const itemClass =
        'flex shrink-0 items-center gap-2 text-sm font-medium text-sidebar-foreground/80 ' +
        'transition-transform duration-200 active:scale-90 hover:text-sidebar-foreground';
</script>

<nav
    aria-label="Main"
    class="fixed inset-x-0 bottom-0 z-40 h-16 rounded-t-2xl border-t border-sidebar-border
           bg-sidebar/90 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md md:hidden"
>
    <div class="flex h-full items-center gap-5 overflow-x-auto px-4 scrollbar-thin">
        <Link href="/" end class={itemClass} activeClass="text-primary scale-105">
            <Home class="size-5 shrink-0" />
            <span class="sr-only">控制台</span>
        </Link>
        <span aria-hidden="true" class="shrink-0 text-muted-foreground/50">&bull;</span>

        {#each navItems as item (item.path)}
            {@const Icon = item.icon ?? Puzzle}
            <Link
                href={item.path ? `/account/${item.path}` : '/account'}
                end={item.end}
                class={itemClass}
                activeClass="text-primary scale-105"
            >
                <Icon class="size-4 shrink-0" />
                <span class="whitespace-nowrap">{item.name}</span>
            </Link>
        {/each}

        {#if app.isAdmin}
            <a href="/admin" class={itemClass}>
                <Cog class="size-4 shrink-0" />
                <span class="whitespace-nowrap">管理后台</span>
            </a>
        {/if}

        <span class="ml-auto flex h-full shrink-0 items-center pl-2">
            <SearchContainer compact />
        </span>
    </div>
</nav>
