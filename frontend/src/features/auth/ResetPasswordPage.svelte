<script lang="ts">
    import { z } from 'zod';
    import { resetWithToken } from '$lib/api/auth';
    import { Form } from '$lib/forms/form.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import { Button, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import AuthLayout from './AuthLayout.svelte';
    import { authState } from './state.svelte';

    /**
     * Reset from an emailed link, ported from ResetPasswordContainer.tsx. Differences: a
     * two-factor account is sent to sign in with a note (the backend does not sign it in,
     * and the legacy page went to `/`, which bounced to the login screen unexplained).
     */
    let { token }: { token: string } = $props();
    const email = router.query.get('email') ?? '';

    const form = new Form({
        schema: z
            .object({ password: z.string().min(8, '密码至少 8 个字符。'), password_confirmation: z.string() })
            .refine(v => v.password === v.password_confirmation, { path: ['password_confirmation'], message: '两次输入的密码不一致。' }),
        initial: { password: '', password_confirmation: '' },
        onSubmit: async values => {
            const response = await resetWithToken({ email, token, ...values });
            if (response.sendToLogin) {
                authState.notice = '密码已重置。这个账号启用了两步验证，请重新登录。';
                navigate('/auth/login');
                return;
            }
            window.location.assign(response.redirectTo);
        },
    });
</script>

<AuthLayout title="设置新密码">
    <form class="space-y-4" onsubmit={e => form.submit(e)} novalidate>
        {#if form.errors._}<Alert variant="destructive">{form.errors._}</Alert>{/if}
        {#if !email}<Alert variant="warning">链接里缺少邮箱地址，请重新打开邮件里的链接。</Alert>{/if}
        <div class="space-y-1.5">
            <Label for="reset-email">邮箱</Label>
            <Input id="reset-email" value={email} disabled />
        </div>
        <div class="space-y-1.5">
            <Label for="reset-password">新密码</Label>
            <Input id="reset-password" type="password" autocomplete="new-password" bind:value={form.values.password} error={form.errors.password} disabled={form.submitting} oninput={() => form.clearError('password')} />
            <p class="text-xs text-muted-foreground">至少 8 个字符。</p>
        </div>
        <div class="space-y-1.5">
            <Label for="reset-confirm">确认新密码</Label>
            <Input id="reset-confirm" type="password" autocomplete="new-password" bind:value={form.values.password_confirmation} error={form.errors.password_confirmation} disabled={form.submitting} oninput={() => form.clearError('password_confirmation')} />
        </div>
        <Button type="submit" class="w-full" loading={form.submitting} disabled={!email}>重置密码</Button>
    </form>
    <p class="mt-4 text-center text-xs"><Link href="/auth/login" class="text-muted-foreground hover:text-foreground">返回登录</Link></p>
</AuthLayout>
