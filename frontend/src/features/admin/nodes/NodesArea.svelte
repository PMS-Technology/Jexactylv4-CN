<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { Plus } from '@lucide/svelte';
    import { adminNodeKeys, createNode, getNodes, type NodeQuery } from '$lib/api/admin/nodes';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import { bytesToString } from '$lib/utils/format';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { pill } from '../billing/labels';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';
    import NodeForm from './NodeForm.svelte';
    import NodePage from './NodePage.svelte';

    /** Nodes, ported from NodesContainer.tsx and NewNodeContainer.tsx. `new` and `:id/*` are matched here. */
    const parts = $derived(router.pathname.replace(/^\/admin\/nodes\/?/, '').replace(/\/+$/, '').split('/').filter(Boolean));
    const nodeId = $derived(parts[0] && /^\d+$/.test(parts[0]) ? Number(parts[0]) : null);

    const queryClient = useQueryClient();
    const table = new TableState<'id' | 'name' | 'fqdn' | 'memory' | 'disk'>();

    const params = $derived<NodeQuery>({
        page: table.page,
        filters: { name: table.query || undefined },
        sorts: table.sorts,
    });

    const nodes = createQuery(() => ({
        queryKey: [...adminNodeKeys.all, 'list', params],
        queryFn: () => getNodes(params),
        placeholderData: keepPreviousData,
        enabled: parts.length === 0,
    }));

    const mib = (v: number) => bytesToString(v * 1024 * 1024);
</script>

<svelte:head>
    <title>节点 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if parts.length === 0}
        <PageHeader title="节点" description="运行 Wings、承载服务器的机器。">
            {#if app.can('nodes.create')}
                <Button href="/admin/nodes/new"><Plus />新建节点</Button>
            {/if}
        </PageHeader>
        <Card class="p-0">
            <div class="border-b border-border p-4">
                <SearchBox bind:value={table.search} placeholder="按名称搜索节点" />
            </div>
            {#if nodes.error}
                <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(nodes.error)}</Alert></div>
            {:else if !nodes.data}
                <Spinner centered />
            {:else if !nodes.data.items.length}
                <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的节点。' : '还没有节点。'}</p>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border text-left text-xs text-muted-foreground">
                            <tr>
                                <SortHeader {table} key="id" label="ID" />
                                <SortHeader {table} key="name" label="名称" />
                                <SortHeader {table} key="fqdn" label="域名" />
                                <SortHeader {table} key="memory" label="内存" />
                                <SortHeader {table} key="disk" label="磁盘" />
                                <th scope="col" class="px-4 py-2 font-medium">连接</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                            {#each nodes.data.items as n (n.id)}
                                <tr>
                                    <td class="px-4 py-3 font-mono text-xs">{n.id}</td>
                                    <td class="px-4 py-3">
                                        <Link href="/admin/nodes/{n.id}" class="font-medium text-primary hover:underline">{n.name}</Link>
                                        {#if n.maintenanceMode}<span class={cn(pill, 'ml-2 bg-warning/15 text-warning')}>维护中</span>{/if}
                                    </td>
                                    <td class="px-4 py-3 font-mono text-xs">{n.fqdn}</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{mib(n.allocated.memory)} / {mib(n.memory)}</td>
                                    <td class="px-4 py-3 whitespace-nowrap">{mib(n.allocated.disk)} / {mib(n.disk)}</td>
                                    <td class="px-4 py-3">
                                        <span class={cn(pill, n.scheme === 'https' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
                                            {n.scheme === 'https' ? 'HTTPS' : 'HTTP'}
                                        </span>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
                <div class="px-4 pb-4">
                    <Pagination pagination={nodes.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
                </div>
            {/if}
        </Card>
    {:else if parts[0] === 'new' && parts.length === 1}
        {#if app.can('nodes.create')}
            <PageHeader title="新建节点" description="添加一台运行 Wings 的机器。" />
            <NodeForm
                submitLabel="创建节点"
                onSubmit={async values => {
                    const node = await createNode(values);
                    await queryClient.invalidateQueries({ queryKey: adminNodeKeys.all });
                    navigate(`/admin/nodes/${node.id}/configuration?setup=true`);
                }}
            />
        {:else}
            <p class="text-sm text-destructive">你没有权限创建节点。</p>
        {/if}
    {:else if nodeId !== null && parts.length <= 2}
        {#key nodeId}
            <NodePage id={nodeId} tab={parts[1] ?? ''} />
        {/key}
    {:else}
        <NotFound backTo="/admin/nodes" />
    {/if}
</div>
