<script lang="ts">
    import { z } from 'zod';
    import { resetWithRecoveryCode } from '$lib/api/auth';
    import { Form } from '$lib/forms/form.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import AuthLayout from './AuthLayout.svelte';
    import { captchaToken } from './captcha';
    import { authState } from './state.svelte';

    /**
     * Password recovery with the account recovery code, ported from ForgotPasswordContainer.tsx.
     * Differences: a successful reset signs the user in, or for a two-factor account sends
     * them to sign in; the legacy page showed an empty success message and stayed put.
     */
    const form = new Form({
        schema: z
            .object({
                email: z.string().trim().email('请输入有效的邮箱地址。'),
                code: z.string().trim().min(1, '请输入账号恢复码。'),
                password: z.string().min(8, '密码至少 8 个字符。'),
                password_confirm: z.string(),
            })
            .refine(v => v.password === v.password_confirm, { path: ['password_confirm'], message: '两次输入的密码不一致。' }),
        initial: { email: '', code: '', password: '', password_confirm: '' },
        onSubmit: async values => {
            const response = await resetWithRecoveryCode(values, await captchaToken());
            if (response.complete) {
                window.location.assign(response.intended || '/');
                return;
            }
            authState.notice = '密码已修改。这个账号启用了两步验证，请重新登录。';
            navigate('/auth/login');
        },
    });

    const fields = [
        { key: 'email', label: '邮箱', type: 'email', autocomplete: 'email', help: '登录面板用的邮箱地址。' },
        { key: 'code', label: '账号恢复码', type: 'text', autocomplete: 'off', help: '创建账号时得到的恢复码。没有的话请联系管理员。' },
        { key: 'password', label: '新密码', type: 'password', autocomplete: 'new-password', help: '至少 8 个字符。' },
        { key: 'password_confirm', label: '确认新密码', type: 'password', autocomplete: 'new-password', help: '' },
    ] as const;
</script>

<AuthLayout title="重置密码" description="用账号恢复码设置新密码。">
    <form class="space-y-4" onsubmit={e => form.submit(e)} novalidate>
        {#if form.errors._}<Alert variant="destructive">{form.errors._}</Alert>{/if}
        {#each fields as f (f.key)}
            <div class="space-y-1.5">
                <Label for="forgot-{f.key}">{f.label}</Label>
                <Input id="forgot-{f.key}" type={f.type} autocomplete={f.autocomplete} bind:value={form.values[f.key]} error={form.errors[f.key]} disabled={form.submitting} oninput={() => form.clearError(f.key)} />
                {#if f.help}<p class="text-xs text-muted-foreground">{f.help}</p>{/if}
            </div>
        {/each}
        <Button type="submit" class="w-full" loading={form.submitting}>重置密码</Button>
    </form>
    <p class="mt-4 text-center text-xs"><Link href="/auth/login" class="text-muted-foreground hover:text-foreground">返回登录</Link></p>
</AuthLayout>
