<script lang="ts">
    import { z } from 'zod';
    import { resetWithRecoveryCode, sendPasswordResetLink } from '$lib/api/auth';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Form } from '$lib/forms/form.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import AuthLayout from './AuthLayout.svelte';
    import { captchaPayload } from './captcha';
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
            const response = await resetWithRecoveryCode(values, await captchaPayload('password'));
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

    /**
     * The panel can also mail a reset link, but only when the admin configured
     * a mail server. The answer is the same for every address, so it cannot be
     * used to find out which addresses have an account.
     */
    const mailEnabled = $derived(Boolean(app.settings?.mail.enabled));

    let linkEmail = $state('');
    let sendingLink = $state(false);
    let linkSent = $state(false);
    let linkError = $state('');

    async function sendLink() {
        if (sendingLink) return;

        sendingLink = true;
        linkSent = false;
        linkError = '';
        try {
            await sendPasswordResetLink(linkEmail.trim(), await captchaPayload('password'));
            linkSent = true;
        } catch (e) {
            linkError = httpErrorToHuman(e);
        } finally {
            sendingLink = false;
        }
    }
</script>

<AuthLayout title="重置密码" description="用账号恢复码设置新密码。">
    <form class="space-y-4" onsubmit={form.submit} novalidate>
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

    {#if mailEnabled}
        <Card class="mt-6">
            <CardHeader>
                <CardTitle>通过邮箱重置</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
                <p class="text-xs text-muted-foreground">
                    没有恢复码？把重置链接发送到你的邮箱地址，链接 {60} 分钟内有效。
                </p>
                <div class="space-y-1.5">
                    <Label for="forgot-link-email">邮箱</Label>
                    <Input id="forgot-link-email" type="email" autocomplete="email" bind:value={linkEmail} disabled={sendingLink} placeholder="you@example.com" />
                </div>
                {#if linkError}
                    <Alert variant="destructive">{linkError}</Alert>
                {:else if linkSent}
                    <Alert variant="success">如果该邮箱对应本面板的账号，重置链接已经发出。</Alert>
                {/if}
                <Button type="button" variant="secondary" class="w-full" loading={sendingLink} disabled={linkEmail.trim() === ''} onclick={sendLink}>
                    发送重置链接
                </Button>
            </CardContent>
        </Card>
    {/if}

    <p class="mt-4 text-center text-xs"><Link href="/auth/login" class="text-muted-foreground hover:text-foreground">返回登录</Link></p>
</AuthLayout>
