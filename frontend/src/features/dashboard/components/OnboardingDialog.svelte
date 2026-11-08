<script lang="ts">
    import { z } from 'zod';
    import { TriangleAlert } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { setupAccount } from '$lib/api/account';
    import { Form } from '$lib/forms/form.svelte';
    import { Button, Dialog, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Onboarding for SSO-registered accounts, ported from `@account/Onboarding.tsx`.
     *
     * The dialog is unconditional and unclosable — a `null_user_` account cannot do
     * anything else on the panel until a real username and password are set. Mirrors
     * the legacy rules in `SetupUserRequest` + the `Everest\Rules\Username` regex.
     */
    const schema = z.object({
        username: z
            .string()
            .min(3, '用户名长度至少为 3 位。')
            .regex(/^[a-z0-9]([\w.-]+)[a-z0-9]$/, '用户名只能包含小写字母、数字、下划线、点和连字符，且需以字母或数字开头和结尾。'),
        password: z.string().min(8, '密码长度至少为 8 位。'),
    });

    const form = new Form({
        schema,
        initial: { username: '', password: '' },
        onSubmit: async values => {
            await setupAccount(values);
            // The backend invalidates the session; a full navigation also drops all
            // client state, matching the legacy `window.location` redirect.
            window.location.assign('/auth/login');
        },
    });

    const appName = $derived(app.settings?.name ?? '');
    const customContent = $derived(app.flags?.auth.modules.onboarding.content);
    const force2fa = $derived(app.flags?.auth.security.force2fa ?? false);
</script>

<!-- preventClose: this dialog is the whole page for a `null_user_` account. -->
<Dialog open={true} preventClose title="👋 欢迎来到 {appName}！">
    <form id="onboarding-form" class="space-y-5" onsubmit={e => form.submit(e)} novalidate>
        {#if form.errors._}
            <Alert variant="destructive">{form.errors._}</Alert>
        {/if}

        <p>我们还缺少一些信息——请现在填写。</p>
        <p class="text-sm text-muted-foreground">
            {customContent ?? '你可以随时在"账号"页中更改这些设置。'}
        </p>

        <div>
            <Label for="onboarding-username">用户名</Label>
            <Input
                id="onboarding-username"
                type="text"
                placeholder="everestuser1"
                autocomplete="username"
                bind:value={form.values.username}
                error={form.errors.username}
                oninput={() => form.clearError('username')}
            />
            <p class="mt-2 text-xs text-muted-foreground">这将是账号的唯一用户名，建议使用你的名字。</p>
        </div>

        <div>
            <Label for="onboarding-password">密码</Label>
            <Input
                id="onboarding-password"
                type="password"
                placeholder="••••••••"
                autocomplete="new-password"
                bind:value={form.values.password}
                error={form.errors.password}
                oninput={() => form.clearError('password')}
            />
            <p class="mt-2 text-xs text-muted-foreground">密码长度至少为 8 位，且包含至少 1 个特殊字符。</p>
        </div>

        {#if force2fa}
            <Alert variant="warning">
                本站安全策略要求启用两步验证。你可以在下一页点击"设置 2FA"完成启用。
            </Alert>
        {/if}
    </form>

    {#snippet footer()}
        <p class="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <TriangleAlert class="size-3.5 text-warning" />
            保存后你的账号将退出登录。
        </p>
        <Button type="submit" form="onboarding-form" size="sm" loading={form.submitting}>保存</Button>
    {/snippet}
</Dialog>
