<script lang="ts">
    import { LayoutDashboard, Cog, ExternalLink, LogOut, Puzzle } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { navigableRoutes } from '$lib/router/types';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';
    import { logout } from '$lib/api/auth';
    import { cn } from '$lib/utils/cn';
    import accountRoutes from './routes';
    import SearchContainer from './components/SearchContainer.svelte';
    import type { CustomLink } from '$lib/api/links';

    let { links = [] }: { links?: CustomLink[] } = $props();

    const navItems = $derived(app.flags ? navigableRoutes(accountRoutes, app.flags) : []);
    const itemClass =
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground';
    const activeItemClass = 'bg-accent text-accent-foreground font-medium';
</script>

<aside
    class="hidden w-60 flex-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
>
    <div class="flex h-14 items-center gap-2 border-b border-sidebar-border px-5">
        <span class="truncate font-header text-base font-semibold">
            {app.settings?.name ?? 'Panel'}
        </span>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin" aria-label="Main">
        <SearchContainer />

        <Link href="/" end class={itemClass} activeClass={activeItemClass}>
            <LayoutDashboard class="size-4 shrink-0" />
            <span>控制台</span>
        </Link>

        {#each navItems as item (item.path)}
            {@const Icon = item.icon ?? Puzzle}
            <Link
                href={item.path ? `/account/${item.path}` : '/account'}
                end={item.end}
                class={itemClass}
                activeClass={activeItemClass}
            >
                <Icon class="size-4 shrink-0" />
                <span>{item.name}</span>
            </Link>
        {/each}

    </nav>

    <div class="space-y-1 border-t border-sidebar-border p-3">
        {#each links as link (link.id)}
            <a href={link.url} target="_blank" rel="noreferrer" class={itemClass}>
                <ExternalLink class="size-4 shrink-0" />
                <span class="truncate">{link.name}</span>
            </a>
        {/each}

        {#if app.isAdmin}
            <a href="/admin" class={itemClass}>
                <Cog class="size-4 shrink-0" />
                <span>管理后台</span>
            </a>
        {/if}

        <button type="button" class={cn(itemClass, 'w-full')} onclick={() => logout()}>
            <LogOut class="size-4 shrink-0" />
            <span>退出登录</span>
        </button>
    </div>

    <div class="flex items-center gap-3 border-t border-sidebar-border p-3">
        <Avatar src={app.user?.avatarUrl} name={app.user?.uuid ?? 'system'} size={36} class="shrink-0" />
        <div class="min-w-0 flex-1">
            <p class="text-xs text-muted-foreground">欢迎回来</p>
            <p class="truncate text-sm" title={app.user?.email}>{app.user?.email}</p>
        </div>
        <ThemeToggle />
    </div>
</aside>
