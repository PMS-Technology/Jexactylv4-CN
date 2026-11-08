<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { LockKeyhole, Unlock, Users, Pencil, Trash2 } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { httpErrorToHuman } from '$lib/api/http';
    import {
        getSubuserPermissions,
        getSubusers,
        modifySubuser,
        deleteSubuser,
    } from '$lib/api/subusers';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import type { Subuser } from '$lib/api/definitions/server';
    import { Button } from '$lib/ui';
    import Spinner from '$lib/ui/Spinner.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import AddSubuserDialog from './AddSubuserDialog.svelte';
    import EditSubuserDialog from './EditSubuserDialog.svelte';
    import ConfirmDeleteDialog from './ConfirmDeleteDialog.svelte';

    /**
     * Subuser management page, ported from `resources/scripts/components/server/users/UsersContainer.tsx`
     * and its children: AddSubuserButton, UserRow, EditSubuserModal, PermissionTitleBox, PermissionRow,
     * RemoveSubuserButton. Maintains permission checks and the rule that users can only grant permissions
     * they themselves hold.
     */
    let { store }: { store: ServerStore } = $props();

    const queryClient = useQueryClient();

    const permissionsQuery = createQuery(() => ({
        queryKey: ['permissions'],
        queryFn: () => getSubuserPermissions(),
        staleTime: Infinity,
    }));

    const subusersQuery = createQuery(() => ({
        queryKey: ['server', store.server!.uuid, 'subusers'],
        queryFn: () => getSubusers(store.server!.uuid),
        enabled: Boolean(store.server),
    }));

    let showAddDialog = $state(false);
    let showEditDialog = $state(false);
    let editingSubuser = $state<Subuser | null>(null);
    let showDeleteDialog = $state(false);
    let deletingSubuser = $state<Subuser | null>(null);
    let isDeleting = $state(false);

    const editablePermissions = $derived.by(() => {
        const catalog = permissionsQuery.data;
        if (!catalog) return [];

        const all = Object.entries(catalog)
            .filter(([key]) => key !== 'websocket')
            .flatMap(([key, group]) =>
                Object.keys(group.keys).map((pkey: string) => `${key}.${pkey}`)
            );

        if (app.user?.rootAdmin || (store.permissions.length === 1 && store.permissions[0] === '*')) {
            return all;
        }

        return all.filter((p: string) => store.permissions.includes(p));
    });

    const isLoading = $derived(permissionsQuery.isPending || subusersQuery.isPending);
    const hasError = $derived(permissionsQuery.isError || subusersQuery.isError);

    const error = $derived(
        permissionsQuery.error ? httpErrorToHuman(permissionsQuery.error) :
        subusersQuery.error ? httpErrorToHuman(subusersQuery.error) :
        ''
    );

    const subusers = $derived(subusersQuery.data ?? []);
    const featureLimit = $derived(store.server?.featureLimits.subusers ?? 0);
    const canCreate = $derived(store.can('user.create'));
    const canUpdate = $derived(store.can('user.update'));
    const canDelete = $derived(store.can('user.delete'));
    // Verbatim from the legacy container: a limit of 0 means subusers are disabled.
    const canAddMore = $derived(featureLimit > 0 && featureLimit > subusers.length);

    let actionError = $state('');

    function openEditDialog(subuser: Subuser) {
        editingSubuser = subuser;
        showEditDialog = true;
    }

    function closeEditDialog() {
        showEditDialog = false;
        editingSubuser = null;
    }

    function openDeleteDialog(subuser: Subuser) {
        deletingSubuser = subuser;
        showDeleteDialog = true;
    }

    function closeDeleteDialog() {
        showDeleteDialog = false;
        deletingSubuser = null;
    }

    async function handleDeleteConfirm() {
        if (!deletingSubuser) return;

        isDeleting = true;
        try {
            await deleteSubuser(store.server!.uuid, deletingSubuser.uuid);
            void queryClient.invalidateQueries({ queryKey: ['server', store.server!.uuid, 'subusers'] });
        } catch (err) {
            console.error(err);
            actionError = httpErrorToHuman(err);
        } finally {
            closeDeleteDialog();
            isDeleting = false;
        }
    }

    async function handleAddSubmit(data: { email: string; permissions: string[] }) {
        // Errors propagate to the dialog's form, which shows them above the fields.
        await modifySubuser(store.server!.uuid, data);
        void queryClient.invalidateQueries({ queryKey: ['server', store.server!.uuid, 'subusers'] });
        showAddDialog = false;
    }

    async function handleEditSubmit(data: { email: string; permissions: string[] }) {
        if (!editingSubuser) return;

        await modifySubuser(store.server!.uuid, data, editingSubuser);
        void queryClient.invalidateQueries({ queryKey: ['server', store.server!.uuid, 'subusers'] });
        closeEditDialog();
    }
</script>

<svelte:head>
    <title>子用户 | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
    <PageHeader title="子用户" description="控制其他用户对此服务器的访问权限。" />

    {#if actionError}
        <Alert variant="destructive">{actionError}</Alert>
    {/if}

    {#if hasError}
        <Alert variant="destructive" title="加载失败">
            {error}
        </Alert>
    {/if}

    {#if isLoading}
        <div class="flex justify-center py-12">
            <Spinner />
        </div>
    {:else if subusers.length === 0}
        <div class="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <Users class="mx-auto mb-3 size-10 opacity-50" />
            <p class="text-sm">您尚未添加任何子用户。</p>
        </div>
    {:else}
        <div class="space-y-2">
            {#each subusers as subuser (subuser.uuid)}
                <div class="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/5">
                    <div class="hidden md:block">
                        <Avatar src={subuser.image} name={subuser.uuid} size={40} />
                    </div>

                    <div class="min-w-0 flex-1">
                        <p class="truncate font-medium text-foreground">{subuser.email}</p>
                        <p class="mt-0.5 truncate text-xs font-mono text-muted-foreground">{subuser.uuid}</p>
                    </div>

                    <div class="ml-4 text-center">
                        <div class="flex justify-center">
                            {#if subuser.twoFactorEnabled}
                                <LockKeyhole class="size-5 text-muted-foreground" />
                            {:else}
                                <Unlock class="size-5 text-red-400" />
                            {/if}
                        </div>
                        <p class="mt-1 hidden text-2xs uppercase text-muted-foreground md:block">2FA</p>
                    </div>

                    <div class="hidden text-center md:block">
                        <p class="font-medium">
                            {subuser.permissions.filter((p: string) => p !== 'websocket.connect').length}
                        </p>
                        <p class="text-2xs uppercase text-muted-foreground">权限</p>
                    </div>

                    {#if subuser.uuid !== app.user?.uuid}
                        <div class="flex gap-2">
                            {#if canUpdate}
                                <button
                                    type="button"
                                    aria-label="编辑子用户"
                                    class="rounded p-2 text-muted-foreground transition-colors hover:text-foreground"
                                    onclick={() => openEditDialog(subuser)}
                                >
                                    <Pencil class="size-4" />
                                </button>
                            {/if}
                            {#if canDelete}
                                <button
                                    type="button"
                                    aria-label="删除子用户"
                                    class="rounded p-2 text-muted-foreground transition-colors hover:text-red-600"
                                    onclick={() => openDeleteDialog(subuser)}
                                >
                                    <Trash2 class="size-4" />
                                </button>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    {#if canCreate}
        <div class="flex flex-col items-end gap-4 sm:flex-row sm:items-center sm:justify-end">
            {#if featureLimit > 0 && subusers.length > 0}
                <p class="text-sm text-muted-foreground">
                    {subusers.length} / {featureLimit} 子用户已创建
                </p>
            {/if}
            {#if canAddMore}
                <Button onclick={() => (showAddDialog = true)}>
                    添加用户
                </Button>
            {/if}
        </div>
    {/if}
</div>

{#if permissionsQuery.data}
    <AddSubuserDialog
        open={showAddDialog}
        permissions={permissionsQuery.data}
        editablePermissions={editablePermissions}
        restricted={!app.user?.rootAdmin && store.permissions[0] !== '*'}
        onOpenChange={(open) => (showAddDialog = open)}
        onSubmit={handleAddSubmit}
    />

    {#if editingSubuser}
        <EditSubuserDialog
            open={showEditDialog}
            subuser={editingSubuser}
            permissions={permissionsQuery.data}
            editablePermissions={editablePermissions}
            restricted={!app.user?.rootAdmin && store.permissions[0] !== '*'}
            onOpenChange={(open) => {
                if (!open) closeEditDialog();
            }}
            onSubmit={handleEditSubmit}
        />
    {/if}
{/if}

{#if deletingSubuser}
    <ConfirmDeleteDialog
        open={showDeleteDialog}
        subuser={deletingSubuser}
        isLoading={isDeleting}
        onOpenChange={(open) => {
            if (!open) closeDeleteDialog();
        }}
        onConfirm={handleDeleteConfirm}
    />
{/if}
