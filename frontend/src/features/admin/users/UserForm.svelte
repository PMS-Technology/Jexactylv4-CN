<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { IdCard, ShieldCheck } from '@lucide/svelte';
    import { adminUserKeys, getAllRoles, type AdminUser, type UserValues } from '$lib/api/admin/users';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';

    /**
     * Create/edit fields, ported from view/UserForm.tsx and RoleSelect.tsx. Differences:
     * - A new user must be given a password. The legacy hint said an empty password would
     *   email a setup link, but UserCreationService only stores a random password and
     *   discards the reset token, and no mail is sent, so the account could not sign in.
     * - Only root admins may change root access or the role (UserController::update), so
     *   other admins see those fields read-only instead of getting an error on save.
     * - Root access cannot be removed from your own account here.
     */
    type Props = { user?: AdminUser | null; submitLabel: string; onSubmit: (values: UserValues) => Promise<void> };
    let { user = null, submitLabel, onSubmit }: Props = $props();

    // Only root admins can change the role, and the list needs roles.read; everyone else
    // just sees the current role name.
    const roles = createQuery(() => ({
        queryKey: [...adminUserKeys.roles, 'all'],
        queryFn: getAllRoles,
        enabled: Boolean(app.user?.rootAdmin) || app.can('roles.read'),
    }));

    let externalId = $state(user?.externalId ?? '');
    let username = $state(user?.username ?? '');
    let email = $state(user?.email ?? '');
    let password = $state('');
    let rootAdmin = $state(user?.rootAdmin ?? false);
    let roleId = $state(user?.roleId === null || user?.roleId === undefined ? '' : String(user.roleId));
    let saving = $state(false);
    let error = $state('');

    const isSelf = $derived(user !== null && user.uuid === app.user?.uuid);
    const canGrant = $derived(Boolean(app.user?.rootAdmin));
    const canSave = $derived(app.can(user ? 'users.update' : 'users.create'));

    // User::$validationRules: username 1–191, email valid and ≤ 191, external id ≤ 191.
    const errors = $derived({
        username: !username.trim() || username.trim().length > 191 ? '用户名需要 1–191 个字符。' : undefined,
        email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 191 ? '请输入有效的邮箱地址。' : undefined,
        externalId: externalId.trim().length > 191 ? '外部 ID 不能超过 191 个字符。' : undefined,
        password: !user && password.length < 8 ? '新用户需要设置至少 8 个字符的密码。' : password && password.length < 8 ? '密码至少 8 个字符。' : undefined,
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            await onSubmit({
                external_id: externalId.trim() || null,
                username: username.trim(),
                email: email.trim(),
                ...(password ? { password } : {}),
                root_admin: rootAdmin,
                admin_role_id: roleId ? Number(roleId) : null,
            });
            password = '';
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    const disabled = $derived(!canSave || saving);
</script>

<form onsubmit={submit} class="space-y-4">
    {#if error}<Alert variant="destructive">{error}</Alert>{/if}

    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><IdCard class="size-4" />账号信息</CardTitle></CardHeader>
        <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
            {#if user}
                <div class="space-y-1.5">
                    <span class="text-sm font-medium">UUID</span>
                    <div class="flex items-center gap-1">
                        <code class="truncate rounded bg-muted px-2 py-1.5 font-mono text-xs">{user.uuid}</code>
                        <CopyButton text={user.uuid} label="" class="px-1" />
                    </div>
                </div>
            {/if}
            <div class="space-y-1.5">
                <Label for="user-external-id">外部 ID</Label>
                <Input id="user-external-id" bind:value={externalId} class="font-mono" {disabled} error={errors.externalId} />
                <p class="text-xs text-muted-foreground">供外部系统对接使用，可选。不清楚用途时不要修改。</p>
            </div>
            <div class="space-y-1.5">
                <Label for="user-username">用户名</Label>
                <Input id="user-username" bind:value={username} autocomplete="off" {disabled} error={username ? errors.username : undefined} />
            </div>
            <div class="space-y-1.5">
                <Label for="user-email">邮箱</Label>
                <Input id="user-email" type="email" bind:value={email} autocomplete="off" {disabled} error={email ? errors.email : undefined} />
            </div>
            <div class="space-y-1.5">
                <Label for="user-password">{user ? '新密码' : '密码'}</Label>
                <Input
                    id="user-password"
                    type="password"
                    bind:value={password}
                    autocomplete="new-password"
                    placeholder={user ? '留空则不修改' : ''}
                    {disabled}
                    error={password ? errors.password : undefined}
                />
                {#if !user}<p class="text-xs text-muted-foreground">面板不会发送邮件，请把密码告诉用户，登录后可以自行修改。</p>{/if}
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><ShieldCheck class="size-4" />管理权限</CardTitle></CardHeader>
        <CardContent class="grid gap-4 text-sm lg:grid-cols-2">
            <div class="space-y-2 rounded-md bg-muted/50 p-3">
                <label class="flex items-center justify-between gap-4">
                    <span>
                        <span class="font-medium">Root 管理员</span>
                        <span class="block text-xs text-muted-foreground">拥有面板的全部权限。</span>
                    </span>
                    <Switch bind:checked={rootAdmin} aria-label="Root 管理员" disabled={disabled || !canGrant || (isSelf && user?.rootAdmin)} />
                </label>
                <p class="text-xs text-warning">建议保持关闭，改为分配一个管理员角色来授予具体权限。</p>
                {#if isSelf && user?.rootAdmin}<p class="text-xs text-muted-foreground">不能在这里取消自己的 Root 权限。</p>{/if}
            </div>
            <div class="space-y-1.5">
                <Label for="user-role">管理员角色</Label>
                <select
                    id="user-role"
                    bind:value={roleId}
                    disabled={disabled || !canGrant || (canGrant && !roles.data)}
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                >
                    <option value="">无（普通用户）</option>
                    {#each roles.data ?? [] as role (role.id)}
                        <option value={String(role.id)}>{role.name}</option>
                    {/each}
                    {#if user?.roleId && !roles.data?.some(r => r.id === user!.roleId)}
                        <option value={String(user.roleId)}>{user.roleName ?? `#${user.roleId}`}</option>
                    {/if}
                </select>
                {#if roles.error}
                    <p class="text-xs text-destructive">{httpErrorToHuman(roles.error)}</p>
                {:else}
                    <p class="text-xs text-muted-foreground">分配角色后，用户可以进入管理后台，但只能使用角色包含的权限。</p>
                {/if}
                {#if !canGrant}<p class="text-xs text-muted-foreground">只有 Root 管理员可以修改 Root 权限和管理员角色。</p>{/if}
            </div>
        </CardContent>
    </Card>

    {#if canSave}
        <div class="flex justify-end">
            <Button type="submit" loading={saving} disabled={!valid}>{submitLabel}</Button>
        </div>
    {/if}
</form>
