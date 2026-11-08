<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Clock, Cog, Server, User } from '@lucide/svelte';
    import {
        adminUserKeys,
        deleteUser,
        getUser,
        getUserActivity,
        toggleUserSuspension,
        updateUser,
    } from '$lib/api/admin/users';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import ActivityFeed from '../shared/ActivityFeed.svelte';
    import ServerSummaryTable from '../shared/ServerSummaryTable.svelte';
    import UserForm from './UserForm.svelte';

    /**
     * One user, ported from UserRouter.tsx and view/*. Differences: the suspend box said
     * "suspended" after unsuspending too and did not refresh the state; the backend refuses
     * to suspend root admins, so the button is hidden for them; your own account cannot be
     * deleted from here.
     */
    let { id, tab }: { id: number; tab: string } = $props();

    const queryClient = useQueryClient();
    const user = createQuery(() => ({ queryKey: adminUserKeys.user(id), queryFn: () => getUser(id) }));

    const tabs = $derived(
        [
            { path: '', name: '资料', icon: User, show: true },
            { path: 'servers', name: '服务器', icon: Server, show: app.can('servers.read') },
            { path: 'activity', name: '活动', icon: Clock, show: app.can('activity.read') },
            { path: 'manage', name: '管理', icon: Cog, show: app.can(['users.update', 'users.delete']) },
        ].filter(t => t.show),
    );

    let saved = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    // --- Manage
    let suspendOpen = $state(false);
    let deleteOpen = $state(false);
    const isSelf = $derived(user.data?.uuid === app.user?.uuid);

    const toggleSuspend = async () => {
        const wasSuspended = user.data!.state === 'suspended';
        await toggleUserSuspension(id);
        await queryClient.invalidateQueries({ queryKey: adminUserKeys.user(id) });
        await queryClient.invalidateQueries({ queryKey: [...adminUserKeys.users, 'list'] });
        notice = { variant: 'success', text: wasSuspended ? '已恢复该用户的访问。' : '已暂停该用户，对方将无法登录。' };
    };

    const remove = async () => {
        await deleteUser(id);
        queryClient.removeQueries({ queryKey: adminUserKeys.user(id) });
        await queryClient.invalidateQueries({ queryKey: adminUserKeys.users });
        navigate('/admin/users');
    };

</script>

{#if user.error && (user.error as { response?: { status?: number } }).response?.status === 404}
    <NotFound backTo="/admin/users" />
{:else if user.error}
    <Alert variant="destructive">{httpErrorToHuman(user.error)}</Alert>
{:else if !user.data}
    <Spinner centered />
{:else}
    {@const u = user.data}
    <ConfirmDialog
        bind:open={suspendOpen}
        title={u.state === 'suspended' ? '恢复用户' : '暂停用户'}
        confirmLabel={u.state === 'suspended' ? '恢复' : '暂停'}
        onConfirm={toggleSuspend}
    >
        {u.state === 'suspended' ? '恢复后，该用户可以重新登录和使用服务器。' : '暂停后，该用户会立即无法登录面板。'}确定继续吗？
    </ConfirmDialog>
    <ConfirmDialog bind:open={deleteOpen} title="删除用户" confirmLabel="删除" onConfirm={remove}>
        确定删除用户 <strong>{u.username}</strong> 吗？对方将无法再访问面板。名下还有服务器时无法删除。
    </ConfirmDialog>

    <div class="mb-4 flex flex-wrap items-center gap-3">
        <Avatar src={u.avatarUrl} name={u.uuid} size={40} />
        <div class="min-w-0 flex-1">
            <h1 class="truncate font-header text-xl font-semibold">{u.email}</h1>
            <p class="truncate font-mono text-xs text-muted-foreground">{u.uuid}</p>
        </div>
        <Button variant="ghost" href="/admin/users"><ArrowLeft />返回用户列表</Button>
    </div>

    <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="用户分类">
        {#each tabs as t (t.path)}
            {@const Icon = t.icon}
            <Link
                href={t.path ? `/admin/users/${id}/${t.path}` : `/admin/users/${id}`}
                end
                class="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                activeClass="border-primary! text-foreground font-medium"
            >
                <Icon class="size-4" />{t.name}
            </Link>
        {/each}
    </nav>

    {#if tab === ''}
        {#if saved}<Alert variant="success" class="mb-4">用户资料已保存。</Alert>{/if}
        {#key u.id}
            <UserForm
                user={u}
                submitLabel="保存"
                onSubmit={async values => {
                    saved = false;
                    const updated = await updateUser(id, values);
                    queryClient.setQueryData(adminUserKeys.user(id), updated);
                    await queryClient.invalidateQueries({ queryKey: [...adminUserKeys.users, 'list'] });
                    saved = true;
                }}
            />
        {/key}
    {:else if tab === 'servers'}
        <ServerSummaryTable filter={{ owner_id: id }} empty="这个用户名下没有服务器。" />
    {:else if tab === 'activity'}
        <ActivityFeed queryKey={adminUserKeys.user(id)} load={p => getUserActivity(id, { page: p, sorts: { timestamp: 'desc' } })} empty="这个用户还没有活动记录。" />
    {:else if tab === 'manage'}
        {#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}
        <div class="grid gap-4 md:grid-cols-2">
            {#if app.can('users.update')}
                <Card>
                    <CardHeader><CardTitle>{u.state === 'suspended' ? '恢复用户' : '暂停用户'}</CardTitle></CardHeader>
                    <CardContent class="space-y-3 text-sm">
                        <p class="text-muted-foreground">
                            当前状态：<span class={u.state === 'suspended' ? 'text-destructive' : 'text-success'}>{u.state === 'suspended' ? '已暂停' : '正常'}</span>。
                            {u.rootAdmin ? 'Root 管理员不能被暂停。' : '暂停后对方立即无法登录，恢复后即可继续使用。'}
                        </p>
                        {#if !u.rootAdmin}
                            <div class="text-right">
                                <Button variant="outline" onclick={() => (suspendOpen = true)}>{u.state === 'suspended' ? '恢复用户' : '暂停用户'}</Button>
                            </div>
                        {/if}
                    </CardContent>
                </Card>
            {/if}
            {#if app.can('users.delete')}
                <Card>
                    <CardHeader><CardTitle>删除用户</CardTitle></CardHeader>
                    <CardContent class="space-y-3 text-sm">
                        <p class="text-muted-foreground">
                            删除账号后对方无法再访问面板。名下还有服务器时需要先删除或转移服务器。{#if isSelf}不能删除自己的账号。{/if}
                        </p>
                        <div class="text-right">
                            <Button variant="destructive" disabled={isSelf} onclick={() => (deleteOpen = true)}>删除用户</Button>
                        </div>
                    </CardContent>
                </Card>
            {/if}
        </div>
    {:else}
        <NotFound backTo="/admin/users/{id}" />
    {/if}
{/if}
