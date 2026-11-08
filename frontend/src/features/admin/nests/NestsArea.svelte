<script lang="ts">
    import { Archive, SlidersHorizontal, SquareTerminal } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import EggPage from './EggPage.svelte';
    import NestPage from './NestPage.svelte';
    import NestsList from './NestsList.svelte';
    import NewEggPage from './NewEggPage.svelte';

    /**
     * Nests and eggs, ported from NestsContainer.tsx, NestEditContainer.tsx, NewEggContainer.tsx
     * and eggs/EggRouter.tsx. routes.ts points `nests/*` (nests.read) here.
     */
    const parts = $derived(router.pathname.replace(/^\/admin\/nests\/?/, '').replace(/\/+$/, '').split('/').filter(Boolean));
    const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);
    const nestId = $derived(num(parts[0]));
    const eggId = $derived(parts[1] === 'eggs' ? num(parts[2]) : null);

    const tabs = $derived(
        [
            { href: '/admin/servers', name: '全部服务器', icon: SquareTerminal, show: app.can('servers.read') },
            { href: '/admin/servers/presets', name: '预设', icon: SlidersHorizontal, show: app.can('server-presets.read') },
            { href: '/admin/nests', name: 'Nests', icon: Archive, show: true },
        ].filter(t => t.show),
    );
</script>

{#snippet nav()}
    <nav class="mb-6 flex gap-1 border-b border-border" aria-label="服务器分类">
        {#each tabs as t (t.href)}
            {@const Icon = t.icon}
            <Link
                href={t.href}
                class="-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm {t.href === '/admin/nests' ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
            >
                <Icon class="size-4" />{t.name}
            </Link>
        {/each}
    </nav>
{/snippet}

<svelte:head>
    <title>Nests | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if parts.length === 0}
        <NestsList {nav} />
    {:else if nestId !== null && parts.length === 1}
        {#key nestId}<NestPage id={nestId} />{/key}
    {:else if nestId !== null && parts.length === 2 && parts[1] === 'new'}
        {#if app.can('eggs.create')}<NewEggPage {nestId} />{:else}<p class="text-sm text-destructive">你没有权限创建 Egg。</p>{/if}
    {:else if nestId !== null && eggId !== null && parts.length <= 4}
        {#key eggId}<EggPage {nestId} id={eggId} tab={parts[3] ?? ''} />{/key}
    {:else}
        <NotFound backTo="/admin/nests" />
    {/if}
</div>
