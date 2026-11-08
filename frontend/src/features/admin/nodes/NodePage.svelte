<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { AlertTriangle, ArrowLeft, Building2, Code, Cog, Server, Trash2, Wifi, Zap } from '@lucide/svelte';
    import {
        adminNodeKeys,
        deleteNode,
        getAllocationCounts,
        getNode,
        getNodeConfiguration,
        getNodeInformation,
        getNodeUtilization,
        updateNode,
    } from '$lib/api/admin/nodes';
    import { httpErrorToHuman } from '$lib/api/http';
    import { getServerSummaries } from '$lib/api/admin/servers';
    import { app } from '$lib/stores/app.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import { bytesToString } from '$lib/utils/format';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import ServerSummaryTable from '../shared/ServerSummaryTable.svelte';
    import AllocationsTab from './AllocationsTab.svelte';
    import NodeForm from './NodeForm.svelte';

    /**
     * One node, ported from NodeRouter.tsx, NodeAboutContainer, NodeEditContainer,
     * NodeConfigurationContainer, NodeDeleteButton and NodeServers. Differences: the
     * "used allocations" bar always read 0% (the view meta has no allocation figure), it is
     * counted from the allocations endpoint; a save that reached the database but not
     * Wings showed as failed; deleting is disabled while servers remain.
     */
    let { id, tab }: { id: number; tab: string } = $props();

    const queryClient = useQueryClient();
    const node = createQuery(() => ({ queryKey: adminNodeKeys.node(id), queryFn: () => getNode(id) }));

    const info = createQuery(() => ({
        queryKey: [...adminNodeKeys.node(id), 'information'],
        queryFn: () => getNodeInformation(id),
        retry: false,
        staleTime: 30_000,
    }));
    const utilization = createQuery(() => ({
        queryKey: [...adminNodeKeys.node(id), 'utilization'],
        queryFn: () => getNodeUtilization(id),
        enabled: tab === '' && Boolean(info.data?.system.supercharged),
        retry: false,
    }));
    const counts = createQuery(() => ({
        queryKey: [...adminNodeKeys.allocations(id), 'counts'],
        queryFn: () => getAllocationCounts(id),
        enabled: tab === '',
    }));
    const configuration = createQuery(() => ({
        queryKey: [...adminNodeKeys.node(id), 'configuration'],
        queryFn: () => getNodeConfiguration(id),
        enabled: tab === 'configuration',
    }));
    const serverCount = createQuery(() => ({
        queryKey: ['admin', 'servers', 'summary', { node_id: id }, 1],
        queryFn: () => getServerSummaries({ node_id: id }),
        enabled: tab === 'settings',
    }));

    const tabs = [
        { path: '', name: '概览', icon: Building2 },
        { path: 'settings', name: '设置', icon: Cog },
        { path: 'configuration', name: '配置文件', icon: Code },
        { path: 'allocations', name: '分配', icon: Wifi },
        { path: 'servers', name: '服务器', icon: Server },
    ];

    const pct = (used: number, total: number) => (total > 0 ? Math.round((used / total) * 1000) / 10 : 0);
    const mib = (v: number) => bytesToString(v * 1024 * 1024);

    let saveNotice = $state<{ variant: 'success' | 'warning'; text: string } | null>(null);

    let deleteOpen = $state(false);
    const hasServers = $derived((serverCount.data?.pagination.total ?? 0) > 0);
    const remove = async () => {
        await deleteNode(id);
        queryClient.removeQueries({ queryKey: adminNodeKeys.node(id) });
        await queryClient.invalidateQueries({ queryKey: adminNodeKeys.all });
        navigate('/admin/nodes');
    };
</script>

{#snippet bar(label: string, value: number, detail: string)}
    <div class="space-y-1.5">
        <div class="flex items-center justify-between text-sm">
            <span>{label}</span>
            <span class={cn('tabular-nums', value > 80 ? 'text-warning' : 'text-muted-foreground')}>
                {#if value > 80}<AlertTriangle class="mr-1 inline size-3.5" />{/if}{value}%
            </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-muted" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
            <div class={cn('h-full rounded-full', value > 100 ? 'bg-destructive' : value > 80 ? 'bg-warning' : 'bg-primary')} style:width="{Math.min(value, 100)}%"></div>
        </div>
        <p class="text-xs text-muted-foreground">{detail}</p>
    </div>
{/snippet}

{#if node.error && (node.error as { response?: { status?: number } }).response?.status === 404}
    <NotFound backTo="/admin/nodes" />
{:else if node.error}
    <Alert variant="destructive">{httpErrorToHuman(node.error)}</Alert>
{:else if !node.data}
    <Spinner centered />
{:else}
    {@const n = node.data}
    <ConfirmDialog bind:open={deleteOpen} title="删除节点" confirmLabel="删除" onConfirm={remove}>
        确定删除节点 <strong>{n.name}</strong> 吗？节点上的分配会一并删除。
    </ConfirmDialog>

    <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
            <h1 class="flex items-center gap-2 truncate font-header text-xl font-semibold">
                {n.name}
                {#if info.isPending}
                    <Spinner size="sm" />
                {:else if info.data}
                    <span class="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success" title="Wings {info.data.version}">
                        {#if info.data.system.supercharged}<Zap class="size-3" />{/if}在线
                    </span>
                {:else}
                    <span class="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">无法连接</span>
                {/if}
                {#if n.maintenanceMode}<span class="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">维护中</span>{/if}
            </h1>
            <p class="truncate font-mono text-xs text-muted-foreground">{n.uuid}</p>
        </div>
        <Button variant="ghost" href="/admin/nodes"><ArrowLeft />返回节点列表</Button>
    </div>

    <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="节点分类">
        {#each tabs as t (t.path)}
            {@const Icon = t.icon}
            <Link
                href={t.path ? `/admin/nodes/${id}/${t.path}` : `/admin/nodes/${id}`}
                end
                class="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                activeClass="border-primary! text-foreground font-medium"
            >
                <Icon class="size-4" />{t.name}
            </Link>
        {/each}
    </nav>

    {#if tab === ''}
        <div class="grid gap-4 lg:grid-cols-3">
            <Card>
                <CardHeader><CardTitle>系统信息</CardTitle></CardHeader>
                <CardContent class="text-sm">
                    {#if info.isPending}
                        <Spinner />
                    {:else if info.error}
                        <Alert variant="destructive">无法连接到这个节点：{httpErrorToHuman(info.error)}</Alert>
                    {:else if info.data}
                        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                            <dt class="text-muted-foreground">版本</dt><dd class="font-mono text-xs">{info.data.version ?? '—'}</dd>
                            <dt class="text-muted-foreground">操作系统</dt><dd class="font-mono text-xs">{info.data.system.type} {info.data.system.release ?? ''}</dd>
                            <dt class="text-muted-foreground">架构</dt><dd class="font-mono text-xs">{info.data.system.arch ?? '—'}</dd>
                            <dt class="text-muted-foreground">CPU 线程</dt><dd class="font-mono text-xs">{info.data.system.cpus ?? '—'}</dd>
                            <dt class="text-muted-foreground">守护进程</dt>
                            <dd class="text-xs">{info.data.system.supercharged ? 'JexpanelSuperDaemon' : 'Pterodactyl Wings'}</dd>
                        </dl>
                    {/if}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>连接</CardTitle></CardHeader>
                <CardContent class="space-y-3 text-sm">
                    <div>
                        <p class="text-xs text-muted-foreground">Wings 地址</p>
                        <p class="font-mono text-xs">{n.scheme}://{n.fqdn}:{n.publicPortHttp}</p>
                    </div>
                    <div>
                        <p class="text-xs text-muted-foreground">SFTP</p>
                        <p class="font-mono text-xs">{n.sftpAlias ?? n.fqdn}:{n.publicPortSftp}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><p class="text-xs text-muted-foreground">内存上限</p><p>{mib(n.memory)}</p></div>
                        <div><p class="text-xs text-muted-foreground">磁盘上限</p><p>{mib(n.disk)}</p></div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>分配情况</CardTitle></CardHeader>
                <CardContent class="space-y-4">
                    {@render bar('已分配给服务器的内存', pct(n.allocated.memory, n.memory), `${mib(n.allocated.memory)} / ${mib(n.memory)}`)}
                    {@render bar('已分配给服务器的磁盘', pct(n.allocated.disk, n.disk), `${mib(n.allocated.disk)} / ${mib(n.disk)}`)}
                    {#if counts.data}
                        {@render bar(
                            '已使用的端口分配',
                            pct(counts.data.total - counts.data.free, counts.data.total),
                            `${counts.data.total - counts.data.free} / ${counts.data.total}`,
                        )}
                    {/if}
                </CardContent>
            </Card>
            {#if utilization.data}
                {@const u = utilization.data}
                <Card class="lg:col-span-3">
                    <CardHeader><CardTitle>实时用量</CardTitle></CardHeader>
                    <CardContent class="grid gap-4 text-sm sm:grid-cols-4">
                        <div><p class="text-xs text-muted-foreground">CPU</p><p class="text-lg font-semibold">{u.cpu.toFixed(1)}%</p></div>
                        <div><p class="text-xs text-muted-foreground">内存</p><p class="text-lg font-semibold">{bytesToString(u.memory.used)} / {bytesToString(u.memory.total)}</p></div>
                        <div><p class="text-xs text-muted-foreground">磁盘</p><p class="text-lg font-semibold">{bytesToString(u.disk.used)} / {bytesToString(u.disk.total)}</p></div>
                        <div><p class="text-xs text-muted-foreground">Swap</p><p class="text-lg font-semibold">{bytesToString(u.swap.used)}</p></div>
                    </CardContent>
                </Card>
            {/if}
        </div>
    {:else if tab === 'settings'}
        {#if saveNotice}<Alert variant={saveNotice.variant} class="mb-4">{saveNotice.text}</Alert>{/if}
        {#key n.id}
            <NodeForm
                node={n}
                submitLabel="保存"
                disabled={!app.can('nodes.update')}
                onSubmit={async values => {
                    saveNotice = null;
                    const { node: updated, warning } = await updateNode(id, values);
                    queryClient.setQueryData(adminNodeKeys.node(id), updated);
                    await queryClient.invalidateQueries({ queryKey: [...adminNodeKeys.all, 'list'] });
                    saveNotice = warning ? { variant: 'warning', text: `已保存，但没能把新配置推送给 Wings：${warning}` } : { variant: 'success', text: '节点设置已保存。' };
                }}
            >
                {#snippet actions()}
                    {#if app.can('nodes.delete')}
                        <span class="flex items-center gap-2">
                            <Button type="button" variant="destructive" disabled={hasServers || serverCount.isPending} onclick={() => (deleteOpen = true)}><Trash2 />删除节点</Button>
                            {#if hasServers}<span class="text-xs text-muted-foreground">还有 {serverCount.data?.pagination.total} 台服务器在这个节点上，需要先迁移或删除。</span>{/if}
                        </span>
                    {/if}
                {/snippet}
            </NodeForm>
        {/key}
    {:else if tab === 'configuration'}
        {#if router.query.get('setup') === 'true'}
            <Alert variant="success" title="节点已创建" class="mb-4">
                把下面的配置复制到新节点的 <code class="font-mono">/etc/pterodactyl/config.yml</code>，然后启动 Wings。完成后到“分配”标签页添加端口，服务器才能使用这个节点。
            </Alert>
        {/if}
        <Card>
            <CardHeader class="flex flex-row items-center justify-between gap-2">
                <CardTitle>config.yml</CardTitle>
                {#if configuration.data}<CopyButton text={configuration.data} />{/if}
            </CardHeader>
            <CardContent>
                {#if configuration.error}
                    <Alert variant="destructive">{httpErrorToHuman(configuration.error)}</Alert>
                {:else if !configuration.data}
                    <Spinner />
                {:else}
                    <Alert variant="warning" class="mb-3">配置里包含节点的通信令牌，不要分享给他人。</Alert>
                    <pre class="overflow-x-auto rounded-md bg-zinc-950 p-4 font-mono text-xs text-zinc-100">{configuration.data}</pre>
                {/if}
            </CardContent>
        </Card>
    {:else if tab === 'allocations'}
        <AllocationsTab nodeId={id} />
    {:else if tab === 'servers'}
        <ServerSummaryTable filter={{ node_id: id }} empty="这个节点上没有服务器。" />
    {:else}
        <NotFound backTo="/admin/nodes/{id}" />
    {/if}
{/if}
