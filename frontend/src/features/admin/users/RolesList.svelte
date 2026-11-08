<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { Plus } from '@lucide/svelte';
    import { adminUserKeys, createRole, getRoles, type RoleQuery } from '$lib/api/admin/users';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';
    import RoleFields from './RoleFields.svelte';

    /**
     * Administrator roles, ported from roles/RolesContainer.tsx and NewRoleButton.tsx. The
     * legacy dialog stayed on the list after creating; this opens the new role so its
     * permissions can be set straight away.
     */
    const table = new TableState<'id' | 'name'>();
    const queryClient = useQueryClient();

    const params = $derived<RoleQuery>({
        page: table.page,
        filters: { name: table.query || undefined },
        sorts: table.sorts,
    });

    const roles = createQuery(() => ({
        queryKey: [...adminUserKeys.roles, 'list', params],
        queryFn: () => getRoles(params),
        placeholderData: keepPreviousData,
    }));

    let createOpen = $state(false);
</script>

<Dialog bind:open={createOpen} title="新建管理员角色">
    {#if createOpen}
        <RoleFields
            id="new-role"
            submitLabel="创建"
            onSubmit={async values => {
                const role = await createRole(values);
                await queryClient.invalidateQueries({ queryKey: adminUserKeys.roles });
                createOpen = false;
                navigate(`/admin/users/roles/${role.id}`);
            }}
        />
    {/if}
</Dialog>

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按名称搜索角色" />
        {#if app.can('roles.create')}
            <Button onclick={() => (createOpen = true)}><Plus />新建角色</Button>
        {/if}
    </div>

    {#if roles.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(roles.error)}</Alert></div>
    {:else if !roles.data}
        <Spinner centered />
    {:else if !roles.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的角色。' : '还没有管理员角色。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="name" label="名称" />
                        <th scope="col" class="px-4 py-2 font-medium">描述</th>
                        <th scope="col" class="px-4 py-2 font-medium">权限数</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each roles.data.items as role (role.id)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{role.id}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center gap-2">
                                    <span class="size-2.5 shrink-0 rounded-full border border-border" style:background-color={role.color ?? 'transparent'} aria-hidden="true"></span>
                                    <Link href="/admin/users/roles/{role.id}" class="font-medium text-primary hover:underline">{role.name}</Link>
                                </span>
                            </td>
                            <td class="px-4 py-3 text-muted-foreground">{role.description ?? ''}</td>
                            <td class="px-4 py-3 tabular-nums">{role.permissions.length}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={roles.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
