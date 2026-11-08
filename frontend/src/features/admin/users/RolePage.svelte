<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Trash2 } from '@lucide/svelte';
    import {
        adminUserKeys,
        deleteRole,
        getRole,
        getRolePermissionGroups,
        updateRole,
        updateRolePermissions,
    } from '$lib/api/admin/users';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import RoleFields from './RoleFields.svelte';

    /**
     * Edit a role, ported from roles/RoleEditContainer.tsx, PermissionsTable.tsx and
     * RoleDeleteButton.tsx. Differences: permissions save through the dedicated endpoint,
     * which ignores unknown keys; the legacy save gave no feedback and ignored errors;
     * deleting returned to `/admin/roles`, a route that does not exist.
     */
    let { id }: { id: number } = $props();

    const queryClient = useQueryClient();
    const role = createQuery(() => ({ queryKey: adminUserKeys.role(id), queryFn: () => getRole(id) }));
    const groups = createQuery(() => ({ queryKey: adminUserKeys.permissions, queryFn: getRolePermissionGroups }));

    const canUpdate = $derived(app.can('roles.update'));

    let selected = $state<string[] | null>(null);
    $effect(() => {
        if (selected === null && role.data) selected = [...role.data.permissions];
    });

    const dirty = $derived(
        Boolean(role.data && selected) &&
            (selected!.length !== role.data!.permissions.length || selected!.some(p => !role.data!.permissions.includes(p))),
    );

    const keysOf = (group: string) => Object.keys(groups.data?.[group]?.keys ?? {}).map(k => `${group}.${k}`);

    function toggle(key: string) {
        selected = selected!.includes(key) ? selected!.filter(k => k !== key) : [...selected!, key];
    }

    function toggleGroup(group: string) {
        const keys = keysOf(group);
        const all = keys.every(k => selected!.includes(k));
        selected = all ? selected!.filter(k => !keys.includes(k)) : [...new Set([...selected!, ...keys])];
    }

    let savingPermissions = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function savePermissions() {
        savingPermissions = true;
        notice = null;
        try {
            const updated = await updateRolePermissions(role.data!, selected!);
            queryClient.setQueryData(adminUserKeys.role(id), updated);
            selected = [...updated.permissions];
            await queryClient.invalidateQueries({ queryKey: [...adminUserKeys.roles, 'list'] });
            notice = { variant: 'success', text: `权限已保存，共 ${updated.permissions.length} 项。` };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            savingPermissions = false;
        }
    }

    let deleteOpen = $state(false);
    const remove = async () => {
        await deleteRole(id);
        queryClient.removeQueries({ queryKey: adminUserKeys.role(id) });
        await queryClient.invalidateQueries({ queryKey: adminUserKeys.roles });
        await queryClient.invalidateQueries({ queryKey: adminUserKeys.users });
        navigate('/admin/users/roles');
    };
</script>

{#if role.error && (role.error as { response?: { status?: number } }).response?.status === 404}
    <NotFound backTo="/admin/users/roles" />
{:else if role.error}
    <Alert variant="destructive">{httpErrorToHuman(role.error)}</Alert>
{:else if !role.data}
    <Spinner centered />
{:else}
    {@const r = role.data}
    <ConfirmDialog bind:open={deleteOpen} title="删除角色" confirmLabel="删除" onConfirm={remove}>
        确定删除角色 <strong>{r.name}</strong> 吗？持有这个角色的用户会失去全部管理权限（同时取消 Root），需要重新分配角色才能恢复。
    </ConfirmDialog>

    <div class="mb-4 flex flex-wrap items-center gap-3">
        <span class="size-3 shrink-0 rounded-full border border-border" style:background-color={r.color ?? 'transparent'} aria-hidden="true"></span>
        <div class="min-w-0 flex-1">
            <h1 class="truncate font-header text-xl font-semibold">{r.name}</h1>
            <p class="truncate text-sm text-muted-foreground">{r.description ?? '没有描述'}</p>
        </div>
        <Button variant="ghost" href="/admin/users/roles"><ArrowLeft />返回角色列表</Button>
    </div>

    <Card class="mb-8 max-w-2xl">
        <CardHeader><CardTitle>角色信息</CardTitle></CardHeader>
        <CardContent>
            {#key r.id}
                <RoleFields
                    id="edit-role"
                    role={r}
                    disabled={!canUpdate}
                    submitLabel="保存"
                    onSubmit={async values => {
                        const updated = await updateRole(id, values);
                        queryClient.setQueryData(adminUserKeys.role(id), updated);
                        await queryClient.invalidateQueries({ queryKey: [...adminUserKeys.roles, 'list'] });
                    }}
                >
                    {#snippet actions()}
                        {#if app.can('roles.delete')}
                            <Button type="button" variant="destructive" onclick={() => (deleteOpen = true)}><Trash2 />删除角色</Button>
                        {/if}
                    {/snippet}
                </RoleFields>
            {/key}
        </CardContent>
    </Card>

    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
            <h2 class="text-lg font-semibold">角色权限</h2>
            <p class="text-sm text-muted-foreground">勾选这个角色可以使用的管理权限。已选 {selected?.length ?? 0} 项。</p>
        </div>
        {#if canUpdate}
            <Button loading={savingPermissions} disabled={!dirty} onclick={savePermissions}>保存权限</Button>
        {/if}
    </div>
    {#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

    {#if groups.error}
        <Alert variant="destructive">{httpErrorToHuman(groups.error)}</Alert>
    {:else if !groups.data || !selected}
        <Spinner centered />
    {:else}
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {#each Object.entries(groups.data) as [group, meta] (group)}
                {@const keys = keysOf(group)}
                {@const count = keys.filter(k => selected!.includes(k)).length}
                <Card>
                    <CardHeader class="pb-2">
                        <label class="flex items-center justify-between gap-2">
                            <CardTitle class="capitalize">{group}</CardTitle>
                            <input
                                type="checkbox"
                                class="size-4 accent-primary"
                                aria-label="全选 {group}"
                                checked={count === keys.length && keys.length > 0}
                                indeterminate={count > 0 && count < keys.length}
                                disabled={!canUpdate}
                                onchange={() => toggleGroup(group)}
                            />
                        </label>
                        <p class="text-xs text-muted-foreground">{meta.description}</p>
                    </CardHeader>
                    <CardContent class="space-y-1.5 text-sm">
                        {#each keys as key (key)}
                            <label class="flex items-start gap-2" title={meta.keys[key.split('.')[1]!]}>
                                <input
                                    type="checkbox"
                                    class="mt-0.5 size-4 shrink-0 accent-primary"
                                    checked={selected.includes(key)}
                                    disabled={!canUpdate}
                                    onchange={() => toggle(key)}
                                />
                                <span>
                                    <span class="font-mono text-xs">{key}</span>
                                    <span class="block text-xs text-muted-foreground">{meta.keys[key.split('.')[1]!]}</span>
                                </span>
                            </label>
                        {/each}
                    </CardContent>
                </Card>
            {/each}
        </div>
    {/if}
{/if}
