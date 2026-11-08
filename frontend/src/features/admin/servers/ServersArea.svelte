<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { Archive, Plus, SlidersHorizontal, Sparkles, SquareTerminal } from '@lucide/svelte';
    import { getNodes } from '$lib/api/admin/nodes';
    import { adminServerKeys, createServerFromPreset, getPresets } from '$lib/api/admin/servers';
    import { app } from '$lib/stores/app.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import { Button } from '$lib/ui';
    import Label from '$lib/ui/Label.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import { httpErrorToHuman } from '$lib/api/http';
    import NewServerPage from './NewServerPage.svelte';
    import ServerPage from './ServerPage.svelte';
    import ServersList from './ServersList.svelte';
    import PresetPage from './presets/PresetPage.svelte';
    import PresetsList from './presets/PresetsList.svelte';

    /**
     * Servers and presets, ported from ServersContainer.tsx, PresetCreationDialog.tsx and the
     * presets containers. routes.ts points `servers/*` (servers.read) and
     * `servers/presets/*` (server-presets.read) here. The legacy "create from preset"
     * dialog reloaded the page afterwards; it now opens the new server.
     */
    const parts = $derived(router.pathname.replace(/^\/admin\/servers\/?/, '').replace(/\/+$/, '').split('/').filter(Boolean));
    const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);
    const listView = $derived(parts.length === 0 || (parts[0] === 'presets' && parts.length === 1));

    const tabs = $derived(
        [
            { href: '/admin/servers', name: '全部服务器', icon: SquareTerminal, show: app.can('servers.read'), active: parts[0] !== 'presets' },
            { href: '/admin/servers/presets', name: '预设', icon: SlidersHorizontal, show: app.can('server-presets.read'), active: parts[0] === 'presets' },
            { href: '/admin/nests', name: 'Nests', icon: Archive, show: app.can('nests.read'), active: false },
        ].filter(t => t.show),
    );

    // --- Create from preset
    const queryClient = useQueryClient();
    let presetOpen = $state(false);
    let presetId = $state('');
    let nodeId = $state('');
    let creating = $state(false);
    let presetError = $state('');

    const presets = createQuery(() => ({ queryKey: [...adminServerKeys.presets, 'options'], queryFn: () => getPresets({}, 100).then(r => r.items), enabled: presetOpen }));
    const nodes = createQuery(() => ({ queryKey: ['admin', 'nodes', 'options'], queryFn: () => getNodes({ sorts: { name: 'asc' } }, 100).then(r => r.items), enabled: presetOpen }));
    const chosen = $derived(presets.data?.find(p => String(p.id) === presetId) ?? null);

    async function fromPreset() {
        creating = true;
        presetError = '';
        try {
            const { id } = await createServerFromPreset(Number(presetId), Number(nodeId));
            presetOpen = false;
            await queryClient.invalidateQueries({ queryKey: adminServerKeys.all });
            navigate(`/admin/servers/${id}`);
        } catch (e) {
            presetError = httpErrorToHuman(e);
        } finally {
            creating = false;
        }
    }

    const select =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

<svelte:head>
    <title>{parts[0] === 'presets' ? '服务器预设' : '服务器'} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<Dialog bind:open={presetOpen} title="用预设创建服务器" preventClose={creating}>
    <div class="space-y-4 text-sm">
        {#if presetError}<Alert variant="destructive">{presetError}</Alert>{/if}
        <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Label for="from-preset">预设</Label>
                <select id="from-preset" class={select} bind:value={presetId} disabled={creating || !presets.data}>
                    <option value="">选择预设…</option>
                    {#each presets.data ?? [] as p (p.id)}<option value={String(p.id)}>{p.name}</option>{/each}
                </select>
            </div>
            <div class="space-y-1.5">
                <Label for="from-node">节点</Label>
                <select id="from-node" class={select} bind:value={nodeId} disabled={creating || !nodes.data}>
                    <option value="">选择节点…</option>
                    {#each nodes.data ?? [] as n (n.id)}<option value={String(n.id)}>{n.name}</option>{/each}
                </select>
            </div>
        </div>
        {#if chosen}
            <p class="rounded-md bg-muted/50 p-3">{chosen.cpu}% CPU · {chosen.memory} MiB 内存 · {chosen.disk} MiB 磁盘</p>
        {/if}
        <p class="text-xs text-muted-foreground">服务器归你所有，使用节点上第一个空闲分配和 Egg 的默认变量。之后可以在服务器页面修改。</p>
    </div>
    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={creating} onclick={() => (presetOpen = false)}>取消</Button>
        <Button size="sm" loading={creating} disabled={!presetId || !nodeId} onclick={fromPreset}><Sparkles />创建</Button>
    {/snippet}
</Dialog>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if listView}
        <PageHeader title={parts[0] === 'presets' ? '服务器预设' : '服务器'} description={parts[0] === 'presets' ? '常用的服务器配置模板。' : '面板上的所有服务器。'}>
            {#if parts.length === 0 && app.can('servers.create')}
                <Button variant="outline" onclick={() => ((presetId = ''), (nodeId = ''), (presetError = ''), (presetOpen = true))}><Sparkles />用预设创建</Button>
                <Button href="/admin/servers/new"><Plus />新建服务器</Button>
            {/if}
        </PageHeader>
        <nav class="mb-6 flex gap-1 border-b border-border" aria-label="服务器分类">
            {#each tabs as t (t.href)}
                {@const Icon = t.icon}
                <Link
                    href={t.href}
                    class="-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm {t.active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
                >
                    <Icon class="size-4" />{t.name}
                </Link>
            {/each}
        </nav>
    {/if}

    {#if parts.length === 0}
        <ServersList />
    {:else if parts[0] === 'new' && parts.length === 1}
        {#if app.can('servers.create')}<NewServerPage />{:else}<p class="text-sm text-destructive">你没有权限创建服务器。</p>{/if}
    {:else if parts[0] === 'presets' && parts.length === 1}
        <PresetsList />
    {:else if parts[0] === 'presets' && parts.length === 2 && num(parts[1]) !== null}
        {#key parts[1]}<PresetPage id={num(parts[1])!} />{/key}
    {:else if num(parts[0]) !== null && parts.length <= 2}
        {#key parts[0]}<ServerPage id={num(parts[0])!} tab={parts[1] ?? ''} />{/key}
    {:else}
        <NotFound backTo="/admin/servers" />
    {/if}
</div>
