<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { Plus } from '@lucide/svelte';
    import { adminUserKeys, getUsers, type AdminUser, type UserQuery } from '$lib/api/admin/users';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { pill } from '../billing/labels';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';

    /**
     * User accounts, ported from UsersContainer.tsx. The legacy search only matched the
     * username; `filter[*]` also matches email, UUID and external ID.
     */
    const table = new TableState<'id' | 'username' | 'email' | 'use_totp' | 'state' | 'root_admin'>();

    const params = $derived<UserQuery>({
        page: table.page,
        filters: { '*': table.query || undefined },
        sorts: table.sorts,
    });

    const users = createQuery(() => ({
        queryKey: [...adminUserKeys.users, 'list', params],
        queryFn: () => getUsers(params),
        placeholderData: keepPreviousData,
    }));

    const level = (u: AdminUser) =>
        u.rootAdmin
            ? { label: 'Root 管理员', class: 'bg-warning/15 text-warning' }
            : u.roleId
              ? { label: u.roleName ?? '管理员', class: 'bg-primary/15 text-primary' }
              : { label: '普通用户', class: 'bg-muted text-muted-foreground' };
</script>

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="搜索用户名、邮箱或 UUID" />
        {#if app.can('users.create')}
            <Button href="/admin/users/new"><Plus />新建用户</Button>
        {/if}
    </div>

    {#if users.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(users.error)}</Alert></div>
    {:else if !users.data}
        <Spinner centered />
    {:else if !users.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的用户。' : '还没有用户。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="username" label="用户名" />
                        <SortHeader {table} key="email" label="邮箱" />
                        <SortHeader {table} key="use_totp" label="两步验证" />
                        <SortHeader {table} key="state" label="状态" />
                        <SortHeader {table} key="root_admin" label="权限" />
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each users.data.items as user (user.id)}
                        {@const l = level(user)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{user.id}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center gap-2 whitespace-nowrap">
                                    <Avatar src={user.avatarUrl} name={user.uuid} size={20} />
                                    <Link href="/admin/users/{user.id}" class="font-medium text-primary hover:underline">{user.username}</Link>
                                </span>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">{user.email}</td>
                            <td class="px-4 py-3">
                                <span class={cn(pill, user.twoFactor ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                                    {user.twoFactor ? '已启用' : '未启用'}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span class={cn(pill, user.state === 'suspended' ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success')}>
                                    {user.state === 'suspended' ? '已暂停' : '正常'}
                                </span>
                            </td>
                            <td class="px-4 py-3"><span class={cn(pill, l.class)}>{l.label}</span></td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={users.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
