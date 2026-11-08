<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { getServerSummaries } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { bytesToString } from '$lib/utils/format';
    import { Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';

    /**
     * Servers owned by a user or placed on a node, standing in for the legacy ServersTable
     * on those pages. Rows link to the server pages, which the legacy bundle still serves.
     */
    let { filter, empty }: { filter: { owner_id?: number; node_id?: number }; empty: string } = $props();

    let page = $state(1);
    const servers = createQuery(() => ({
        queryKey: ['admin', 'servers', 'summary', filter, page],
        queryFn: () => getServerSummaries(filter, page),
        placeholderData: keepPreviousData,
    }));

    const size = (mib: number) => (mib ? bytesToString(mib * 1024 * 1024) : '不限');
    const status = (s: string | null) =>
        ({ installing: '安装中', install_failed: '安装失败', reinstall_failed: '重装失败', suspended: '已暂停', restoring_backup: '恢复中' })[s ?? ''] ??
        (s ?? '正常');
</script>

<Card class="p-0">
    {#if servers.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(servers.error)}</Alert></div>
    {:else if !servers.data}
        <Spinner centered />
    {:else if !servers.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{empty}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <th scope="col" class="px-4 py-2 font-medium">ID</th>
                        <th scope="col" class="px-4 py-2 font-medium">名称</th>
                        <th scope="col" class="px-4 py-2 font-medium">标识</th>
                        {#if filter.node_id === undefined}<th scope="col" class="px-4 py-2 font-medium">节点</th>{/if}
                        {#if filter.owner_id === undefined}<th scope="col" class="px-4 py-2 font-medium">所有者</th>{/if}
                        <th scope="col" class="px-4 py-2 font-medium">内存 / 磁盘</th>
                        <th scope="col" class="px-4 py-2 font-medium">状态</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each servers.data.items as s (s.id)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{s.id}</td>
                            <td class="px-4 py-3"><Link href="/admin/servers/{s.id}" class="font-medium text-primary hover:underline">{s.name}</Link></td>
                            <td class="px-4 py-3 font-mono text-xs">{s.identifier}</td>
                            {#if filter.node_id === undefined}
                                <td class="px-4 py-3"><Link href="/admin/nodes/{s.nodeId}" class="hover:underline">#{s.nodeId}</Link></td>
                            {/if}
                            {#if filter.owner_id === undefined}
                                <td class="px-4 py-3"><Link href="/admin/users/{s.ownerId}" class="hover:underline">#{s.ownerId}</Link></td>
                            {/if}
                            <td class="px-4 py-3 whitespace-nowrap">{size(s.limits.memory)} / {size(s.limits.disk)}</td>
                            <td class="px-4 py-3">{status(s.status)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={servers.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
        </div>
    {/if}
</Card>
