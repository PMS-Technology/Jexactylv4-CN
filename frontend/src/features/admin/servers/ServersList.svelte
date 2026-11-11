<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { adminServerKeys, bulkPower, getServers, type PowerAction, type ServerQuery } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Checkbox, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { stagger } from '$lib/motion/stagger';
    import { pill } from '../billing/labels';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';
    import { serverStatus } from './limits';

    /**
     * All servers, ported from ServersTable.tsx with bulk power actions. The legacy search
     * only matched the name; the identifier is searched as well (one request each).
     */
    const table = new TableState<'id' | 'uuidShort' | 'name' | 'owner_id' | 'node_id' | 'status'>();

    const params = $derived<ServerQuery>({ page: table.page, filters: { name: table.query || undefined }, sorts: table.sorts });

    const servers = createQuery(() => ({
        queryKey: [...adminServerKeys.all, 'list', params],
        queryFn: async () => {
            const byName = await getServers(params);
            if (!table.query || table.page !== 1) return byName;
            const byId = await getServers({ filters: { uuidShort: table.query } });
            const extra = byId.items.filter(s => !byName.items.some(n => n.id === s.id));

            return { ...byName, items: [...extra, ...byName.items] };
        },
        placeholderData: keepPreviousData,
    }));

    let selected = $state<number[]>([]);
    $effect(() => {
        void servers.data;
        selected = [];
    });
    const ids = $derived(servers.data?.items.map(s => s.id) ?? []);
    const all = $derived(ids.length > 0 && ids.every(id => selected.includes(id)));

    let sending = $state<PowerAction | null>(null);
    let notice = $state<{ variant: 'success' | 'warning' | 'destructive'; text: string } | null>(null);
    const actionLabel: Record<PowerAction, string> = { start: '启动', restart: '重启', stop: '停止', kill: '强制停止' };

    async function power(action: PowerAction) {
        sending = action;
        notice = null;
        const count = selected.length;
        try {
            const result = await bulkPower(selected, action);
            const skipped = count - result.total;
            const parts = [`已向 ${result.total - result.failed.length} 台服务器发送“${actionLabel[action]}”`];
            if (result.failed.length) parts.push(`${result.failed.length} 台失败（${[...new Set(result.failed.map(f => f.message))].join('；')}）`);
            if (skipped > 0) parts.push(`${skipped} 台因安装中、已暂停或迁移中被跳过`);
            notice = { variant: result.failed.length ? 'warning' : 'success', text: parts.join('，') + '。' };
            selected = [];
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            sending = null;
        }
    }
</script>

{#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="搜索名称或标识" />
        {#if selected.length && app.can('servers.update')}
            <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="text-muted-foreground">已选 {selected.length} 台</span>
                {#each ['start', 'restart', 'stop', 'kill'] as const as a (a)}
                    <Button size="sm" variant={a === 'kill' ? 'destructive' : 'outline'} loading={sending === a} disabled={sending !== null} onclick={() => power(a)}>
                        {actionLabel[a]}
                    </Button>
                {/each}
            </div>
        {/if}
    </div>

    {#if servers.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(servers.error)}</Alert></div>
    {:else if !servers.data}
        <Spinner centered />
    {:else if !servers.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的服务器。' : '还没有服务器。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <th scope="col" class="w-10 px-4 py-2">
                            <Checkbox
                                aria-label="全选本页"
                                checked={all}
                                indeterminate={selected.length > 0 && !all}
                                onCheckedChange={() => (selected = all ? [] : [...ids])}
                            />
                        </th>
                        <SortHeader {table} key="uuidShort" label="标识" />
                        <SortHeader {table} key="name" label="名称" />
                        <SortHeader {table} key="owner_id" label="所有者" />
                        <SortHeader {table} key="node_id" label="节点" />
                        <SortHeader {table} key="status" label="状态" />
                    </tr>
                </thead>
                <tbody class="divide-y divide-border" use:stagger={{ selector: 'tr', distance: 6, step: 0.02 }}>
                    {#each servers.data.items as s (s.id)}
                        {@const st = serverStatus(s.status)}
                        <tr>
                            <td class="px-4 py-3">
                                <Checkbox
                                    aria-label="选择 {s.name}"
                                    checked={selected.includes(s.id)}
                                    onCheckedChange={() => (selected = selected.includes(s.id) ? selected.filter(i => i !== s.id) : [...selected, s.id])}
                                />
                            </td>
                            <td class="px-4 py-3 font-mono text-xs">{s.identifier}</td>
                            <td class="px-4 py-3"><Link href="/admin/servers/{s.id}" class="font-medium text-primary hover:underline">{s.name}</Link></td>
                            <td class="px-4 py-3">
                                {#if s.owner}
                                    <Link href="/admin/users/{s.owner.id}" class="hover:underline">{s.owner.email}</Link>
                                    <span class="block text-xs text-muted-foreground">{s.owner.username}</span>
                                {:else}—{/if}
                            </td>
                            <td class="px-4 py-3">
                                {#if s.node}
                                    <Link href="/admin/nodes/{s.node.id}" class="hover:underline">{s.node.name}</Link>
                                    <span class="block font-mono text-xs text-muted-foreground">{s.node.fqdn}</span>
                                {:else}—{/if}
                            </td>
                            <td class="px-4 py-3"><span class={cn(pill, st.class)}>{st.label}</span></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={servers.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
