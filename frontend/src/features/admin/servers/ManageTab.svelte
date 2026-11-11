<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeftRight, Download, EyeOff, Eye, Wrench } from '@lucide/svelte';
    import { getNodes } from '$lib/api/admin/nodes';
    import {
        adminServerKeys,
        allocationText,
        getFreeAllocations,
        reinstallServer,
        suspendServer,
        toggleInstallStatus,
        transferServer,
        unsuspendServer,
        type AdminServer,
    } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Reinstall, install status, suspension and transfer, ported from manage/*. The legacy
     * boxes closed their dialog before the request finished, showed "suspended" style
     * messages even on failure paths built from `error.message`, never refreshed the
     * server status, and the transfer dialog only looked at the first 20 allocations of the
     * target node. The backend gates reinstall and suspension on `servers.delete` and
     * transfer and the install toggle on `servers.update`; the buttons follow that.
     */
    let { server }: { server: AdminServer } = $props();

    const queryClient = useQueryClient();
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    const refresh = () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: adminServerKeys.server(server.id) }),
            queryClient.invalidateQueries({ queryKey: [...adminServerKeys.all, 'list'] }),
        ]);

    const action = (task: () => Promise<void>, success: string) => async () => {
        notice = null;
        await task();
        await refresh();
        notice = { variant: 'success', text: success };
    };

    let reinstallOpen = $state(false);
    let toggleOpen = $state(false);
    let suspendOpen = $state(false);

    const suspended = $derived(server.status === 'suspended');
    const installing = $derived(server.status === 'installing');

    // --- Transfer
    let transferOpen = $state(false);
    let targetNode = $state('');
    let targetAllocation = $state('');
    let transferring = $state(false);
    let transferError = $state('');

    const nodes = createQuery(() => ({
        queryKey: ['admin', 'nodes', 'options'],
        queryFn: () => getNodes({ sorts: { name: 'asc' } }, 100).then(r => r.items),
        enabled: transferOpen,
    }));
    const targets = $derived((nodes.data ?? []).filter(n => n.id !== server.nodeId));
    const free = createQuery(() => ({
        queryKey: ['admin', 'nodes', Number(targetNode), 'allocations', 'free', ''],
        queryFn: () => getFreeAllocations(Number(targetNode)),
        enabled: Boolean(targetNode),
    }));
    $effect(() => {
        if (free.data && !free.data.some(a => String(a.id) === targetAllocation)) targetAllocation = free.data[0] ? String(free.data[0].id) : '';
    });

    async function transfer() {
        transferring = true;
        transferError = '';
        try {
            await transferServer(server.id, { node_id: Number(targetNode), allocation_id: Number(targetAllocation) });
            transferOpen = false;
            await refresh();
            notice = { variant: 'success', text: '迁移已开始，服务器会停止并把文件移到新节点，可能需要几分钟。' };
        } catch (e) {
            transferError = httpErrorToHuman(e);
        } finally {
            transferring = false;
        }
    }

    const nodeOptions = $derived([
        { value: '', label: '选择节点…' },
        ...targets.map(n => ({ value: String(n.id), label: `${n.name}（${n.fqdn}）` })),
    ]);

    const allocationOptions = $derived([
        ...(free.data && !free.data.length ? [{ value: '', label: '这个节点没有空闲分配' }] : []),
        ...(free.data ?? []).map(a => ({ value: String(a.id), label: allocationText(a) })),
    ]);
</script>

<ConfirmDialog bind:open={reinstallOpen} title="重装服务器" confirmLabel="重装" onConfirm={action(() => reinstallServer(server.id), '服务器开始重装。')}>
    确定现在重装吗？安装脚本可能覆盖或损坏服务器上的文件。
</ConfirmDialog>
<ConfirmDialog
    bind:open={toggleOpen}
    title="修改安装状态"
    confirmLabel="确认"
    onConfirm={action(() => toggleInstallStatus(server.id), installing ? '已标记为安装完成。' : '已标记为安装中。')}
>
    把服务器标记为“{installing ? '已安装' : '安装中'}”。这只改面板里的状态，不会运行安装脚本。
</ConfirmDialog>
<ConfirmDialog
    bind:open={suspendOpen}
    title={suspended ? '恢复服务器' : '暂停服务器'}
    confirmLabel={suspended ? '恢复' : '暂停'}
    onConfirm={action(() => (suspended ? unsuspendServer(server.id) : suspendServer(server.id)), suspended ? '服务器已恢复。' : '服务器已暂停。')}
>
    {suspended ? '恢复后所有者可以重新管理这台服务器。' : '暂停会停止服务器进程，所有者将立即无法管理它。'}
</ConfirmDialog>

<Dialog bind:open={transferOpen} title="迁移服务器" preventClose={transferring}>
    <div class="space-y-4 text-sm">
        {#if transferError}<Alert variant="destructive">{transferError}</Alert>{/if}
        <Alert variant="warning">迁移会停止服务器，并把所有文件复制到新节点，期间服务器不可用。</Alert>
        <div class="space-y-1.5">
            <Select
                id="transfer-node"
                items={nodeOptions}
                bind:value={targetNode}
                disabled={transferring || !nodes.data}
                label="目标节点"
            />
            {#if nodes.data && !targets.length}<p class="text-xs text-muted-foreground">没有其他节点可以迁移。</p>{/if}
        </div>
        {#if targetNode}
            <div class="space-y-1.5">
                <Select
                    id="transfer-allocation"
                    items={allocationOptions}
                    bind:value={targetAllocation}
                    disabled={transferring || !free.data?.length}
                    label="新节点上的主分配"
                />
            </div>
        {/if}
    </div>
    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={transferring} onclick={() => (transferOpen = false)}>取消</Button>
        <Button variant="destructive" size="sm" loading={transferring} disabled={!targetNode || !targetAllocation} onclick={transfer}>开始迁移</Button>
    {/snippet}
</Dialog>

{#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {#if app.can('servers.delete')}
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Wrench class="size-4" />重装</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                <p class="text-muted-foreground">用当前 Egg 的安装脚本重新安装，可能覆盖服务器数据。</p>
                <Button variant="destructive" class="w-full" onclick={() => (reinstallOpen = true)}>重装服务器</Button>
            </CardContent>
        </Card>
    {/if}
    {#if app.can('servers.update')}
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Download class="size-4" />安装状态</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                <p class="text-muted-foreground">当前：<span class="text-foreground">{installing ? '安装中' : server.status === 'install_failed' ? '安装失败' : '已安装'}</span>。只修改面板里的标记。</p>
                <Button variant="outline" class="w-full" disabled={server.status === 'install_failed'} onclick={() => (toggleOpen = true)}>
                    标记为{installing ? '已安装' : '安装中'}
                </Button>
                {#if server.status === 'install_failed'}<p class="text-xs text-muted-foreground">安装失败的服务器不能切换，请重装。</p>{/if}
            </CardContent>
        </Card>
    {/if}
    {#if app.can('servers.delete')}
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2">{#if suspended}<Eye class="size-4" />{:else}<EyeOff class="size-4" />{/if}{suspended ? '恢复' : '暂停'}</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                <p class="text-muted-foreground">{suspended ? '这台服务器已暂停，所有者无法使用。' : '暂停会停止服务器，并阻止所有者通过面板管理它。'}</p>
                <Button variant={suspended ? 'outline' : 'destructive'} class="w-full" onclick={() => (suspendOpen = true)}>{suspended ? '恢复服务器' : '暂停服务器'}</Button>
            </CardContent>
        </Card>
    {/if}
    {#if app.can('servers.update')}
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><ArrowLeftRight class="size-4" />迁移</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                <p class="text-muted-foreground">把服务器和文件迁移到另一个节点。</p>
                <Button
                    variant="outline"
                    class="w-full"
                    disabled={server.status === 'transferring'}
                    onclick={() => {
                        targetNode = '';
                        transferError = '';
                        transferOpen = true;
                    }}
                >
                    迁移服务器
                </Button>
            </CardContent>
        </Card>
    {/if}
</div>
