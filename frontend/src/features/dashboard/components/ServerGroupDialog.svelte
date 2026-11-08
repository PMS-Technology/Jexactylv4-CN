<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { Plus, Trash } from '@lucide/svelte';
    import {
        addServerToGroup,
        createServerGroup,
        deleteServerGroup,
        getServerGroups,
        updateServerGroup,
    } from '$lib/api/groups';
    import type { ServerGroup } from '$lib/api/definitions/server';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Dialog, Input, Label, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Server group management, ported from
     * `@account/groups/{ServerGroupDialog,ModifyServerGroup,ServerGroupDialog}.tsx`.
     *
     * The legacy dashboard drove four dialogs from a `VisibleDialog` state machine and
     * reloaded the page after adding a server; here the index view owns create/edit,
     * and `assignServerUuid` (passed by the page) opens the pick-a-group dialog, with
     * the affected queries invalidated on success instead.
     */
    type Props = {
        open?: boolean;
        /** UUID of the server to add to a group; non-null opens the assign dialog. */
        assignServerUuid?: string | null;
        onAssignClose?: () => void;
    };

    let { open = $bindable(false), assignServerUuid = null, onAssignClose }: Props = $props();

    const queryClient = useQueryClient();

    const groupsQuery = createQuery(() => ({
        queryKey: ['server-groups'],
        queryFn: getServerGroups,
        enabled: open || assignServerUuid !== null,
    }));

    // Create / edit dialog state; `editing` is null while creating.
    let editing = $state<ServerGroup | null>(null);
    let editOpen = $state(false);
    let name = $state('');
    let color = $state('');
    let saving = $state(false);
    let saveError = $state('');

    let deletingId = $state<number | null>(null);
    let deleteError = $state('');

    let assigning = $state<number | null>(null);
    let assignError = $state('');

    // Dialog's `bind:open` needs a writable value; the prop decides when it opens and
    // closing it (Escape / outside click) notifies the page to clear its UUID.
    let assignOpen = $state(false);
    $effect(() => {
        assignOpen = assignServerUuid !== null;
    });
    $effect(() => {
        if (!assignOpen && assignServerUuid !== null) {
            onAssignClose?.();
        }
    });

    function openCreate() {
        editing = null;
        name = '';
        color = '';
        saveError = '';
        editOpen = true;
    }

    function openEdit(group: ServerGroup) {
        editing = group;
        name = group.name;
        color = group.color ?? '';
        saveError = '';
        editOpen = true;
    }

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (saving) return;

        saving = true;
        saveError = '';
        try {
            const values = { name: name.trim(), color: color || undefined };
            if (editing) {
                await updateServerGroup(editing.id, values);
            } else {
                await createServerGroup(values);
            }

            editOpen = false;
            await queryClient.invalidateQueries({ queryKey: ['server-groups'] });
            // Cards may already be showing this group's badge.
            await queryClient.invalidateQueries({ queryKey: ['servers'] });
        } catch (e) {
            saveError = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    async function remove(group: ServerGroup) {
        deleteError = '';
        deletingId = group.id;
        try {
            await deleteServerGroup(group.id);
            await queryClient.invalidateQueries({ queryKey: ['server-groups'] });
            await queryClient.invalidateQueries({ queryKey: ['servers'] });
        } catch (e) {
            deleteError = httpErrorToHuman(e);
        } finally {
            deletingId = null;
        }
    }

    async function assign(group: ServerGroup) {
        if (!assignServerUuid || assigning) return;

        assigning = group.id;
        assignError = '';
        try {
            await addServerToGroup(group.id, assignServerUuid);
            onAssignClose?.();
            // The dashboard cards show group badges; refresh them with the new assignment.
            await queryClient.invalidateQueries({ queryKey: ['servers'] });
            await queryClient.invalidateQueries({ queryKey: ['server-search'] });
        } catch (e) {
            assignError = httpErrorToHuman(e);
        } finally {
            assigning = null;
        }
    }

    const groups = $derived(groupsQuery.data ?? []);
</script>

<Dialog bind:open title="服务器分组" description="创建分组并将服务器归类，方便在控制台区分管理。">
    {#if groupsQuery.isPending}
        <Spinner centered />
    {:else if groupsQuery.isError}
        <Alert variant="destructive">{httpErrorToHuman(groupsQuery.error)}</Alert>
    {:else if groups.length === 0}
        <div class="py-8 text-center text-sm text-muted-foreground">当前账号还没有分组。</div>
    {:else}
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {#each groups as group (group.id)}
                <div class="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <button
                        type="button"
                        class="min-w-0 truncate text-sm font-medium hover:underline"
                        style={group.color ? `color: ${group.color}` : undefined}
                        title="编辑分组"
                        onclick={() => openEdit(group)}
                    >
                        {group.name}
                    </button>
                    <button
                        type="button"
                        class="shrink-0 text-muted-foreground/60 transition-colors hover:text-destructive"
                        title="删除分组"
                        disabled={deletingId === group.id}
                        onclick={() => remove(group)}
                    >
                        {#if deletingId === group.id}
                            <Spinner size="sm" />
                        {:else}
                            <Trash class="size-3.5" />
                        {/if}
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    {#if deleteError}
        <Alert variant="destructive" class="mt-3">{deleteError}</Alert>
    {/if}

    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (open = false)}>关闭</Button>
        <Button size="sm" onclick={openCreate}>
            <Plus class="mr-1 size-3.5" /> 创建分组
        </Button>
    {/snippet}
</Dialog>

<Dialog bind:open={editOpen} title={editing ? `编辑分组 ${editing.name}` : '创建分组'} preventClose={saving}>
    <form id="server-group-form" class="space-y-4" onsubmit={save} novalidate>
        <div>
            <Label for="server-group-name">分组名称</Label>
            <Input id="server-group-name" bind:value={name} maxlength={191} required />
        </div>
        <div>
            <Label for="server-group-color">分组颜色</Label>
            <input
                id="server-group-color"
                type="color"
                bind:value={color}
                class="h-9 w-full cursor-pointer rounded-md border border-input bg-background p-1"
            />
            <p class="mt-1 text-xs text-muted-foreground">分组标记显示的颜色（十六进制值）。</p>
        </div>
        {#if saveError}
            <Alert variant="destructive">{saveError}</Alert>
        {/if}
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (editOpen = false)}>取消</Button>
        <Button type="submit" form="server-group-form" size="sm" loading={saving} disabled={!name.trim()}>
            {editing ? '更新' : '创建'}
        </Button>
    {/snippet}
</Dialog>

<Dialog bind:open={assignOpen} title="添加到分组">
    {#if groupsQuery.isPending}
        <Spinner centered />
    {:else if groups.length === 0}
        <div class="py-8 text-center text-sm text-muted-foreground">还没有分组，先创建一个吧。</div>
    {:else}
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {#each groups as group (group.id)}
                <button
                    type="button"
                    class="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
                    disabled={assigning === group.id}
                    onclick={() => assign(group)}
                >
                    <span
                        class="min-w-0 truncate text-sm font-medium"
                        style={group.color ? `color: ${group.color}` : undefined}
                    >
                        {group.name}
                    </span>
                    {#if assigning === group.id}
                        <Spinner size="sm" />
                    {:else}
                        <Plus class="size-3.5 shrink-0 text-success" />
                    {/if}
                </button>
            {/each}
        </div>
    {/if}

    {#if assignError}
        <Alert variant="destructive" class="mt-3">{assignError}</Alert>
    {/if}
</Dialog>
