<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import {
        Archive,
        Lock,
        Download,
        RotateCcw,
        Trash2,
    } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import {
        getBackups,
        createBackup,
        getBackupUrl,
        restoreBackup,
        toggleBackupLock,
        deleteBackup,
        type BackupResponse,
    } from '$lib/api/backups';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Checkbox, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Textarea from '$lib/ui/Textarea.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import type { Backup } from '$lib/api/definitions/server';
    import { Form } from '$lib/forms/form.svelte';
    import { z } from 'zod';
    import BackupRow from './BackupRow.svelte';
    import Pagination from '$lib/components/Pagination.svelte';

    /**
     * Server backups page, ported from BackupContainer.tsx and its children:
     * BackupRow.tsx, BackupContextMenu.tsx, and CreateBackupButton.tsx.
     */
    let { store }: { store: ServerStore } = $props();

    const queryClient = useQueryClient();
    let currentPage = $state(1);
    let createDialogOpen = $state(false);
    let selectedBackup: Backup | null = $state(null);
    let contextMenuOpen = $state(false);
    let deleteConfirmOpen = $state(false);
    let restoreConfirmOpen = $state(false);
    let truncateRestore = $state(false);
    let unlockConfirmOpen = $state(false);
    let loadingAction = $state(false);
    let actionError = $state<string | null>(null);

    const backupsQuery = createQuery(() => ({
        queryKey: ['server', store.server!.uuid, 'backups', currentPage],
        queryFn: () => getBackups(store.server!.uuid, currentPage),
        retry: 2,
    }));

    const backups = $derived(backupsQuery.data);
    const isLoading = $derived(backupsQuery.isPending);
    const error = $derived(backupsQuery.error);

    const backupLimit = $derived(store.server?.featureLimits?.backups ?? 0);
    const canCreateBackup = $derived(store.can('backup.create') && backupLimit > 0);
    const canDownload = $derived(store.can('backup.download'));
    const canRestore = $derived(store.can('backup.restore'));
    const canDelete = $derived(store.can('backup.delete'));

    const showCreateCount = $derived(
        backups && backupLimit > 0 && backups.backupCount > 0,
    );
    const canCreateMore = $derived(
        backups && backupLimit > 0 && backupLimit > backups.backupCount,
    );

    // Form for creating backup
    const createForm = new Form({
        schema: z.object({
            name: z.string().max(191),
            ignored: z.string(),
            isLocked: z.boolean(),
        }),
        initial: { name: '', ignored: '', isLocked: false },
        onSubmit: async (values) => {
            await createBackup(store.server!.uuid, values);
            void queryClient.invalidateQueries({
                queryKey: ['server', store.server!.uuid, 'backups'],
            });
            createDialogOpen = false;
            createForm.reset();
        },
    });

    // Applied when a row's `backup completed:<uuid>` event arrives, as the legacy mutate did.
    function onBackupCompleted(uuid: string, parsed: Record<string, any>) {
        queryClient.setQueryData<BackupResponse>(['server', store.server!.uuid, 'backups', currentPage], data =>
            data
                ? {
                      ...data,
                      items: data.items.map(b =>
                          b.uuid !== uuid
                              ? b
                              : {
                                    ...b,
                                    isSuccessful: parsed.is_successful ?? true,
                                    checksum: (parsed.checksum_type || '') + ':' + (parsed.checksum || ''),
                                    bytes: parsed.file_size || 0,
                                    completedAt: new Date(),
                                },
                      ),
                  }
                : data,
        );
    }

    function openContextMenu(backup: Backup) {
        selectedBackup = backup;
        contextMenuOpen = true;
        actionError = null;
    }

    function closeContextMenu() {
        contextMenuOpen = false;
        selectedBackup = null;
    }

    async function handleDownload() {
        if (!selectedBackup) return;
        loadingAction = true;
        actionError = null;

        try {
            const url = await getBackupUrl(store.server!.uuid, selectedBackup.uuid);
            window.location.href = url;
        } catch (err) {
            actionError = httpErrorToHuman(err);
        } finally {
            loadingAction = false;
        }
    }

    // Confirmations replace the action dialog, like the legacy menu → modal flow; stacking
    // two dialogs leaves the inner one unclickable. Their handlers let errors propagate so
    // ConfirmDialog stays open and shows the message.
    function openConfirm(open: () => void) {
        contextMenuOpen = false;
        open();
    }

    async function handleRestore() {
        if (!selectedBackup) return;
        openConfirm(() => (restoreConfirmOpen = true));
    }

    async function confirmRestore() {
        if (!selectedBackup) return;
        loadingAction = true;
        try {
            await restoreBackup(store.server!.uuid, selectedBackup.uuid, truncateRestore);
            store.patchServer({ status: 'restoring_backup' });
            truncateRestore = false;
        } finally {
            loadingAction = false;
        }
    }

    async function handleLockToggle() {
        if (!selectedBackup) return;

        if (selectedBackup.isLocked) {
            openConfirm(() => (unlockConfirmOpen = true));
            return;
        }

        loadingAction = true;
        actionError = null;

        try {
            await toggleBackupLock(store.server!.uuid, selectedBackup.uuid);
            void queryClient.invalidateQueries({
                queryKey: ['server', store.server!.uuid, 'backups'],
            });
            closeContextMenu();
        } catch (err) {
            actionError = httpErrorToHuman(err);
        } finally {
            loadingAction = false;
        }
    }

    async function confirmUnlock() {
        if (!selectedBackup) return;
        loadingAction = true;
        try {
            await toggleBackupLock(store.server!.uuid, selectedBackup.uuid);
            void queryClient.invalidateQueries({ queryKey: ['server', store.server!.uuid, 'backups'] });
        } finally {
            loadingAction = false;
        }
    }

    async function handleDelete() {
        if (!selectedBackup) return;
        if (selectedBackup.isLocked) return;
        openConfirm(() => (deleteConfirmOpen = true));
    }

    async function confirmDelete() {
        if (!selectedBackup) return;
        loadingAction = true;
        try {
            await deleteBackup(store.server!.uuid, selectedBackup.uuid);
            void queryClient.invalidateQueries({ queryKey: ['server', store.server!.uuid, 'backups'] });
        } finally {
            loadingAction = false;
        }
    }

    function resetCreateForm() {
        createForm.reset();
        createDialogOpen = false;
    }

    function getUnlockTitle(): string {
        return selectedBackup ? `确认解锁 "${selectedBackup.name}"` : '确认解锁';
    }

    function getRestoreTitle(): string {
        return selectedBackup ? `确认恢复 "${selectedBackup.name}"` : '确认恢复';
    }

    function getDeleteTitle(): string {
        return selectedBackup ? `确认删除 "${selectedBackup.name}"` : '确认删除';
    }
</script>

<svelte:head>
    <title>备份 | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="备份" description="保护你的服务器数据安全。" />

    {#if error}
        <Alert variant="destructive" class="mb-4">
            {httpErrorToHuman(error)}
        </Alert>
    {/if}

    {#if isLoading && !backups}
        <div class="flex justify-center py-12">
            <Spinner />
        </div>
    {:else if backups && backups.items.length > 0}
        <div class="space-y-2">
            {#each backups.items as backup (backup.uuid)}
                <BackupRow
                    {backup}
                    {canDownload}
                    {canRestore}
                    {canDelete}
                    onContextMenu={() => openContextMenu(backup)}
                    {store}
                    onCompleted={payload => onBackupCompleted(backup.uuid, payload)}
                />
            {/each}
        </div>

        {#if backups.pagination}
            <Pagination
                pagination={backups.pagination}
                currentPage={currentPage}
                onPageChange={(page) => {
                    currentPage = page;
                }}
            />
        {/if}
    {:else if backups && backups.items.length === 0}
        <div class="rounded-lg border border-border bg-card p-8 text-center">
            <Archive class="mx-auto mb-4 size-12 text-muted-foreground" />
            <p class="text-muted-foreground">
                {#if currentPage > 1}
                    看起来没有更多备份了，请尝试返回前一页。
                {:else}
                    此服务器还没有备份。
                {/if}
            </p>
        </div>
    {/if}

    {#if backupLimit === 0}
        <div class="mt-4 rounded-lg border border-border bg-card p-4 text-center">
            <p class="text-sm text-muted-foreground">
                此服务器不能创建备份，因为备份数量限制已设置为 0。
            </p>
        </div>
    {/if}

    {#if canCreateBackup}
        <div class="mt-6 flex flex-col items-end gap-4 sm:flex-row sm:items-center sm:justify-between">
            {#if showCreateCount}
                <p class="text-sm text-muted-foreground">
                    已为此服务器创建 {backups?.backupCount ?? 0} 个，共 {backupLimit} 个备份
                </p>
            {/if}
            {#if canCreateMore}
                <Button onclick={() => createDialogOpen = true} class="w-full sm:w-auto">
                    创建备份
                </Button>
            {/if}
        </div>
    {/if}

</div>

<!-- Create Backup Dialog -->
<Dialog bind:open={createDialogOpen} title="创建服务器备份">
    <form onsubmit={(e) => {
        e.preventDefault();
        void createForm.submit();
    }} class="space-y-6">
        {#if createForm.errors._}
            <Alert variant="destructive">{createForm.errors._}</Alert>
        {/if}

        <div>
            <Label for="backup-name">备份名称</Label>
            <Input
                id="backup-name"
                type="text"
                placeholder="（可选）"
                bind:value={createForm.values.name}
                onchange={() => createForm.clearError('name')}
                disabled={createForm.submitting}
            />
            {#if createForm.errors.name}
                <p class="mt-1 text-sm text-destructive">{createForm.errors.name}</p>
            {/if}
            <p class="mt-2 text-sm text-muted-foreground">
                用来标识这个备份的名称（可选）。
            </p>
        </div>

        <div>
            <Label for="backup-ignored">忽略的文件和目录</Label>
            <Textarea
                id="backup-ignored"
                placeholder="每行一个文件或目录"
                rows={6}
                bind:value={createForm.values.ignored}
                onchange={() => createForm.clearError('ignored')}
                disabled={createForm.submitting}
            />
            {#if createForm.errors.ignored}
                <p class="mt-1 text-sm text-destructive">{createForm.errors.ignored}</p>
            {/if}
            <p class="mt-2 text-sm text-muted-foreground">
                输入备份时要忽略的文件或文件夹。如果留空，则使用服务器目录根目录中的 .pteroignore 文件的内容（如果存在）。支持通配符匹配和用 ! 前缀否定规则。
            </p>
        </div>

        {#if canDelete}
            <div class="rounded-lg bg-muted p-4">
                <Checkbox
                    bind:checked={createForm.values.isLocked}
                    disabled={createForm.submitting}
                    class="size-5"
                    wrapperClass="items-start gap-3"
                >
                    {#snippet children({ id })}
                        <div id={id}>
                            <p class="font-medium">锁定</p>
                            <p class="text-sm text-muted-foreground">
                                防止此备份被自动或意外删除，直到显式解锁。
                            </p>
                        </div>
                    {/snippet}
                </Checkbox>
            </div>
        {/if}

        <div class="flex justify-end gap-3">
            <Button
                type="button"
                variant="outline"
                onclick={() => resetCreateForm()}
                disabled={createForm.submitting}
            >
                取消
            </Button>
            <Button
                type="submit"
                disabled={createForm.submitting}
            >
                {#if createForm.submitting}
                    <Spinner class="mr-2 size-4" />
                {/if}
                开始备份
            </Button>
        </div>
    </form>
</Dialog>

<!-- Context Menu Dialog -->
{#if selectedBackup}
    <Dialog bind:open={contextMenuOpen} title="编辑备份">
        {#if actionError}
            <Alert variant="destructive" class="mb-4">{actionError}</Alert>
        {/if}

        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {#if canDownload}
                <Button
                    variant="outline"
                    onclick={handleDownload}
                    disabled={loadingAction || !selectedBackup.completedAt}
                >
                    <Download class="mr-2 size-4" />
                    下载
                </Button>
            {/if}

            {#if canRestore}
                <Button
                    variant="outline"
                    onclick={handleRestore}
                    disabled={loadingAction || !selectedBackup.completedAt}
                >
                    <RotateCcw class="mr-2 size-4" />
                    恢复
                </Button>
            {/if}

            {#if canDelete}
                <Button
                    variant="outline"
                    onclick={handleLockToggle}
                    disabled={loadingAction}
                >
                    <Lock class="mr-2 size-4" />
                    {selectedBackup.isLocked ? '解锁' : '锁定'}
                </Button>

                {#if !selectedBackup.isLocked}
                    <Button
                        variant="destructive"
                        onclick={handleDelete}
                        disabled={loadingAction}
                    >
                        <Trash2 class="mr-2 size-4" />
                        删除
                    </Button>
                {/if}
            {/if}
        </div>

        <div class="mt-4 flex justify-end">
            <Button
                type="button"
                variant="outline"
                onclick={closeContextMenu}
            >
                关闭
            </Button>
        </div>
    </Dialog>
{/if}

<!-- Unlock Confirmation -->
<ConfirmDialog
    bind:open={unlockConfirmOpen}
    title={getUnlockTitle()}
    confirmLabel="解锁"
    onConfirm={confirmUnlock}
>
    <p>此备份将不再受保护，可能被自动或意外删除。</p>
</ConfirmDialog>

<!-- Restore Confirmation -->
<ConfirmDialog
    bind:open={restoreConfirmOpen}
    title={getRestoreTitle()}
    confirmLabel="恢复"
    onConfirm={confirmRestore}
>
    <div class="space-y-4">
        <p>你的服务器将被停止。在恢复完成之前，你无法控制电源状态、访问文件管理器或创建其他备份。</p>

        <div class="rounded-lg bg-muted p-4">
            <Checkbox bind:checked={truncateRestore} disabled={loadingAction} class="size-5" label="在恢复备份前删除所有文件。" />
        </div>
    </div>
</ConfirmDialog>

<!-- Delete Confirmation -->
<ConfirmDialog
    bind:open={deleteConfirmOpen}
    title={getDeleteTitle()}
    confirmLabel="继续"
    onConfirm={confirmDelete}
>
    <p>这是一个永久操作。删除后备份无法恢复。</p>
</ConfirmDialog>
