<script lang="ts">
    import { z } from 'zod';
    import { UserPlus } from '@lucide/svelte';
    import { login, register } from '$lib/api/auth';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Form } from '$lib/forms/form.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import AuthLayout from './AuthLayout.svelte';
    import { captchaToken } from './captcha';
    import { authState } from './state.svelte';

    /**
     * Sign up, ported from RegisterContainer.tsx. The new account is signed in straight
     * away, as before. Differences: when that sign-in is refused (a jGuard delay on new
     * accounts, or reCAPTCHA) the page now goes to the login screen with the reason; the
     * legacy page stayed on its spinner.
     */
    const form = new Form({
        schema: z
            .object({
                username: z.string().trim().min(1, '请输入用户名。'),
                email: z.string().trim().email('请输入有效的邮箱地址。'),
                password: z.string().min(8, '密码至少 8 个字符。'),
                confirm_password: z.string(),
            })
            .refine(v => v.password === v.confirm_password, { path: ['confirm_password'], message: '两次输入的密码不一致。' }),
        initial: { username: '', email: '', password: '', confirm_password: '' },
        onSubmit: async values => {
            await register(values, await captchaToken());
            try {
                const response = await login(values.username, values.password, await captchaToken());
                window.location.assign(response.intended || '/');
            } catch (e) {
                authState.notice = `账号已创建，但暂时无法登录：${httpErrorToHuman(e)}`;
                navigate('/auth/login');
            }
        },
    });

    const fields = [
        { key: 'username', label: '用户名', type: 'text', autocomplete: 'username' },
        { key: 'email', label: '邮箱', type: 'email', autocomplete: 'email' },
        { key: 'password', label: '密码', type: 'password', autocomplete: 'new-password' },
        { key: 'confirm_password', label: '确认密码', type: 'password', autocomplete: 'new-password' },
    ] as const;
</script>

<AuthLayout title="创建账号">
    <form class="space-y-4" onsubmit={e => form.submit(e)} novalidate>
        {#if form.errors._}<Alert variant="destructive">{form.errors._}</Alert>{/if}
        {#each fields as f (f.key)}
            <div class="space-y-1.5">
                <Label for="register-{f.key}">{f.label}</Label>
                <Input id="register-{f.key}" type={f.type} autocomplete={f.autocomplete} bind:value={form.values[f.key]} error={form.errors[f.key]} disabled={form.submitting} oninput={() => form.clearError(f.key)} />
            </div>
        {/each}
        <Button type="submit" class="w-full" loading={form.submitting}><UserPlus />注册</Button>
    </form>
    <p class="mt-4 text-center text-xs text-muted-foreground">已经有账号？<Link href="/auth/login" class="text-primary hover:underline">登录</Link></p>
</AuthLayout>
