<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { UserPlus, Users } from '@lucide/svelte';
    import { adminUserKeys, createUser } from '$lib/api/admin/users';
    import { app } from '$lib/stores/app.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import RolePage from './RolePage.svelte';
    import RolesList from './RolesList.svelte';
    import UserForm from './UserForm.svelte';
    import UserPage from './UserPage.svelte';
    import UsersList from './UsersList.svelte';

    /**
     * Users and administrator roles, ported from UsersContainer.tsx, NewUserContainer.tsx,
     * UserRouter.tsx and the roles containers. Every sub-page is matched here; routes.ts
     * points `users/*` (users.read) and `users/roles/*` (roles.read) at this component.
     */
    const parts = $derived(router.pathname.replace(/^\/admin\/users\/?/, '').replace(/\/+$/, '').split('/').filter(Boolean));
    const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : null);

    const queryClient = useQueryClient();

    const tabs = $derived(
        [
            { href: '/admin/users', name: '用户', icon: Users, show: app.can('users.read'), active: parts[0] !== 'roles' },
            { href: '/admin/users/roles', name: '管理员角色', icon: UserPlus, show: app.can('roles.read'), active: parts[0] === 'roles' },
        ].filter(t => t.show),
    );
    const listView = $derived(parts.length === 0 || (parts[0] === 'roles' && parts.length === 1));
</script>

<svelte:head>
    <title>{parts[0] === 'roles' ? '管理员角色' : '用户'} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if listView}
        <PageHeader
            title={parts[0] === 'roles' ? '管理员角色' : '用户'}
            description={parts[0] === 'roles' ? '角色是一组管理权限，可以分配给面板管理员。' : '所有可以访问面板的账号。'}
        />
        <nav class="mb-6 flex gap-1 border-b border-border" aria-label="用户分类">
            {#each tabs as t (t.href)}
                {@const Icon = t.icon}
                <Link
                    href={t.href}
                    class="-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm {t.active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}"
                >
                    <Icon class="size-4" />{t.name}
                </Link>
            {/each}
        </nav>
    {/if}

    {#if parts.length === 0}
        <UsersList />
    {:else if parts[0] === 'new' && parts.length === 1}
        {#if app.can('users.create')}
            <PageHeader title="新建用户" description="为面板添加一个新账号。" />
            <UserForm
                submitLabel="创建用户"
                onSubmit={async values => {
                    const user = await createUser(values);
                    await queryClient.invalidateQueries({ queryKey: adminUserKeys.users });
                    navigate(`/admin/users/${user.id}`);
                }}
            />
        {:else}
            <p class="text-sm text-destructive">你没有权限创建用户。</p>
        {/if}
    {:else if parts[0] === 'roles' && parts.length === 1}
        <RolesList />
    {:else if parts[0] === 'roles' && parts.length === 2 && num(parts[1]) !== null}
        {#key parts[1]}
            <RolePage id={num(parts[1])!} />
        {/key}
    {:else if num(parts[0]) !== null && parts.length <= 2}
        {#key parts[0]}
            <UserPage id={num(parts[0])!} tab={parts[1] ?? ''} />
        {/key}
    {:else}
        <NotFound backTo="/admin/users" />
    {/if}
</div>
