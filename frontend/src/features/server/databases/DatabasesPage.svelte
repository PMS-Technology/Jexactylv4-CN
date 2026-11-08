<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { Eye, Trash2 } from '@lucide/svelte';
    import { getDatabases, deleteDatabase } from '$lib/api/databases';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import type { Database } from '$lib/api/definitions/server';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { Button, Dialog, Input, Label, Spinner, ConfirmDialog } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import CreateDatabaseDialog from './CreateDatabaseDialog.svelte';
    import RotatePasswordButton from './RotatePasswordButton.svelte';

    /** Ported from DatabasesContainer.tsx, DatabaseRow.tsx, CreateDatabaseButton.tsx, RotatePasswordButton.tsx */
    let { store }: { store: ServerStore } = $props();

    const queryClient = useQueryClient();
    let selectedDatabase = $state<string | null>(null);
    let showConnectionModal = $state(false);
    let showDeleteConfirm = $state(false);

    const databasesQuery = createQuery(() => ({
        queryKey: ['server', store.server!.id, 'databases'],
        queryFn: () => getDatabases(store.server!.uuid),
    }));

    const databases = $derived.by(() => databasesQuery.data ?? []);
    const isLoading = $derived.by(() => databasesQuery.isPending);
    const error = $derived.by(() => databasesQuery.error);
    const databaseLimit = $derived(store.server?.featureLimits.databases ?? 0);
    const canCreate = $derived(store.can('database.create'));
    const canDelete = $derived(store.can('database.delete'));
    const canViewPassword = $derived(store.can('database.view_password'));
    const canUpdate = $derived(store.can('database.update'));

    const currentDatabase = $derived(databases.find(d => d.id === selectedDatabase));
    const jdbcConnectionString = $derived.by(() => {
        if (!currentDatabase) return '';
        return `jdbc:mysql://${currentDatabase.username}${
            currentDatabase.password ? `:${encodeURIComponent(currentDatabase.password)}` : ''
        }@${currentDatabase.connectionString}/${currentDatabase.name}`;
    });

    function openConnectionModal(databaseId: string) {
        selectedDatabase = databaseId;
        showConnectionModal = true;
    }

    let confirmName = $state('');

    // Legacy accepted either the full name or the part after the `s{id}_` prefix.
    const confirmMatches = $derived(
        !!currentDatabase &&
            confirmName !== '' &&
            [currentDatabase.name.split('_', 2)[1] ?? '', currentDatabase.name].includes(confirmName),
    );

    function openDeleteConfirm(databaseId: string) {
        selectedDatabase = databaseId;
        confirmName = '';
        showDeleteConfirm = true;
    }

    // Errors propagate so ConfirmDialog keeps itself open and shows the message.
    async function handleDelete() {
        if (!selectedDatabase) return;

        await deleteDatabase(store.server!.uuid, selectedDatabase);
        void queryClient.invalidateQueries({ queryKey: ['server', store.server!.id, 'databases'] });
    }
</script>

<svelte:head>
    <title>数据库 | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
    <PageHeader title="数据库" description="直接为您的服务器分配数据库。" />

    {#if error}
        <Alert variant="destructive" title="错误">
            {httpErrorToHuman(error)}
        </Alert>
    {/if}

    {#if isLoading}
        <div class="flex justify-center py-12">
            <Spinner size="lg" />
        </div>
    {:else if databases.length === 0}
        <div class="space-y-4 rounded-lg border border-border bg-card p-8 text-center">
            <p class="text-sm text-muted-foreground">
                {databaseLimit > 0 ? '看起来您还没有数据库。' : '此服务器无法创建数据库。'}
            </p>
            {#if canCreate && databaseLimit > 0}
                <div class="flex justify-center">
                    <CreateDatabaseDialog {store} />
                </div>
            {/if}
        </div>
    {:else}
        <div class="space-y-2">
            {#each databases as database (database.id)}
                <div class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center">
                    <div class="flex-1 min-w-0">
                        <div class="mb-2 flex items-center gap-2">
                            <p class="font-mono text-sm font-medium">{database.name}</p>
                            <CopyButton text={database.name} label="" class="p-0 size-auto" />
                        </div>
                        <div class="hidden space-y-1 text-xs text-muted-foreground md:block">
                            <div class="flex items-center gap-2">
                                <span class="font-mono">{database.connectionString}</span>
                                <span class="uppercase">端点</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span>{database.allowConnectionsFrom}</span>
                                <span class="uppercase">允许连接</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-mono">{database.username}</span>
                                <CopyButton text={database.username} label="" class="p-0 size-auto" />
                                <span class="uppercase">用户名</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 md:w-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            onclick={() => openConnectionModal(database.id)}
                            class="gap-2"
                        >
                            <Eye class="size-4" />
                            <span class="hidden sm:inline">详情</span>
                        </Button>
                        {#if canDelete}
                            <Button
                                variant="destructive"
                                size="sm"
                                onclick={() => openDeleteConfirm(database.id)}
                                class="gap-2"
                            >
                                <Trash2 class="size-4" />
                                <span class="hidden sm:inline">删除</span>
                            </Button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        {#if canCreate && databaseLimit > databases.length && databaseLimit > 0}
            <div class="flex flex-col items-end gap-4 sm:flex-row sm:items-center">
                {#if databaseLimit > 0 && databases.length > 0}
                    <p class="flex-1 text-sm text-muted-foreground">
                        已为此服务器分配 {databases.length} 个（共 {databaseLimit} 个）数据库。
                    </p>
                {/if}
                <CreateDatabaseDialog {store} />
            </div>
        {/if}
    {/if}

    <!-- Connection Details Modal -->
    <Dialog
        bind:open={showConnectionModal}
        title="数据库连接详情"
    >
        {#if currentDatabase}
            <div class="space-y-4">
                <div>
                    <Label for="conn-endpoint">端点</Label>
                    <Input
                        id="conn-endpoint"
                        type="text"
                        readonly
                        value={currentDatabase.connectionString}
                    />
                    <CopyButton text={currentDatabase.connectionString} label="复制" class="mt-2" />
                </div>

                <div>
                    <Label for="conn-from">允许连接</Label>
                    <Input id="conn-from" type="text" readonly value={currentDatabase.allowConnectionsFrom} />
                </div>

                <div>
                    <Label for="conn-username">用户名</Label>
                    <Input id="conn-username" type="text" readonly value={currentDatabase.username} />
                    <CopyButton text={currentDatabase.username} label="复制" class="mt-2" />
                </div>

                {#if canViewPassword && currentDatabase.password}
                    <div>
                        <Label for="conn-password">密码</Label>
                        <Input id="conn-password" type="text" readonly value={currentDatabase.password} />
                        <CopyButton text={currentDatabase.password} label="复制" class="mt-2" />
                    </div>
                {/if}

                <div>
                    <Label for="conn-jdbc">JDBC 连接字符串</Label>
                    <Input id="conn-jdbc" type="text" readonly value={jdbcConnectionString} />
                    <CopyButton text={jdbcConnectionString} label="复制" class="mt-2" />
                </div>
            </div>
        {/if}

        {#snippet footer()}
            {#if canUpdate && currentDatabase}
                <RotatePasswordButton
                    databaseId={currentDatabase.id}
                    {store}
                    onUpdate={updated =>
                        queryClient.setQueryData<Database[]>(['server', store.server!.id, 'databases'], list =>
                            list?.map(d => (d.id === updated.id ? updated : d)),
                        )}
                />
            {/if}
            <Button variant="ghost" size="sm" onclick={() => (showConnectionModal = false)}>关闭</Button>
        {/snippet}
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
        bind:open={showDeleteConfirm}
        title="确认删除数据库"
        confirmLabel="删除数据库"
        onConfirm={handleDelete}
        disabled={!confirmMatches}
    >
        <p>
            删除数据库是一个永久性操作，无法撤销。这将永久删除
            <strong>{currentDatabase?.name ?? ''}</strong> 数据库及其所有关联数据。
        </p>
        <div class="space-y-1.5">
            <Label for="confirm-db-name">确认数据库名称</Label>
            <Input id="confirm-db-name" bind:value={confirmName} autocomplete="off" />
            <p class="text-xs text-muted-foreground">输入数据库名称以确认删除。</p>
        </div>
    </ConfirmDialog>
</div>
