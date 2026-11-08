<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Database, Trash2 } from '@lucide/svelte';
    import { adminDatabaseKeys, deleteDatabaseHost, getDatabaseHost, hostAddress, updateDatabaseHost } from '$lib/api/admin/databases';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import DatabaseHostForm from './DatabaseHostForm.svelte';

    /**
     * Edit a database host, ported from DatabaseEditContainer.tsx and
     * DatabaseDeleteButton.tsx. Deleting is blocked here while the host still has
     * databases: `databases.database_host_id` has no ON DELETE, so the backend answers
     * with a foreign key error instead.
     */
    let { params }: { params: { id: string } } = $props();
    const id = $derived(/^\d+$/.test(params.id) ? Number(params.id) : null);

    const queryClient = useQueryClient();
    const host = createQuery(() => ({
        queryKey: adminDatabaseKeys.host(id ?? 0),
        queryFn: () => getDatabaseHost(id!),
        enabled: id !== null,
    }));

    let saved = $state(false);
    let deleteOpen = $state(false);

    const remove = async () => {
        await deleteDatabaseHost(id!);
        queryClient.removeQueries({ queryKey: adminDatabaseKeys.host(id!) });
        await queryClient.invalidateQueries({ queryKey: adminDatabaseKeys.all });
        navigate('/admin/databases');
    };

    const inUse = $derived((host.data?.databaseCount ?? 0) > 0);
</script>

<svelte:head>
    <title>{host.data?.name ?? '数据库主机'} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-3xl p-6 lg:p-8">
    {#if id === null || (host.error && (host.error as { response?: { status?: number } }).response?.status === 404)}
        <NotFound backTo="/admin/databases" />
    {:else if host.error}
        <Alert variant="destructive">{httpErrorToHuman(host.error)}</Alert>
    {:else if !host.data}
        <Spinner centered />
    {:else}
        <ConfirmDialog bind:open={deleteOpen} title="删除数据库主机" confirmLabel="删除" onConfirm={remove}>
            确定删除数据库主机 <strong>{host.data.name}</strong> 吗？主机上的数据库本身不会被删除，但面板不再管理它们。
        </ConfirmDialog>

        <div class="mb-6 flex flex-wrap items-center gap-3">
            <Database class="size-8 text-muted-foreground" />
            <div class="min-w-0 flex-1">
                <h1 class="truncate font-header text-xl font-semibold">{host.data.name}</h1>
                <p class="truncate font-mono text-xs text-muted-foreground">{hostAddress(host.data)}</p>
            </div>
            <Button variant="ghost" href="/admin/databases"><ArrowLeft />返回列表</Button>
        </div>

        {#if saved}<Alert variant="success" class="mb-4">已保存，面板已用新凭据成功连接到主机。</Alert>{/if}

        <Card>
            <CardHeader><CardTitle>主机信息</CardTitle></CardHeader>
            <CardContent>
                {#key host.data.id}
                    <DatabaseHostForm
                        id="edit-database-host"
                        host={host.data}
                        disabled={!app.can('databases.update')}
                        submitLabel="保存"
                        onSubmit={async values => {
                            saved = false;
                            const updated = await updateDatabaseHost(id!, values);
                            queryClient.setQueryData(adminDatabaseKeys.host(id!), { ...updated, databaseCount: host.data?.databaseCount ?? null });
                            await queryClient.invalidateQueries({ queryKey: [...adminDatabaseKeys.all, 'list'] });
                            saved = true;
                        }}
                    >
                        {#snippet actions()}
                            {#if app.can('databases.delete')}
                                <Button type="button" variant="destructive" disabled={inUse} onclick={() => (deleteOpen = true)}><Trash2 />删除</Button>
                            {/if}
                        {/snippet}
                    </DatabaseHostForm>
                {/key}
                {#if inUse}
                    <p class="mt-3 text-xs text-muted-foreground">这个主机上还有 {host.data.databaseCount} 个服务器数据库，先在服务器上删除它们才能删除主机。</p>
                {/if}
            </CardContent>
        </Card>
    {/if}
</div>
