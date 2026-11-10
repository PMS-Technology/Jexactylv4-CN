<script lang="ts">
    import { z } from 'zod';
    import { Fingerprint, LogIn, Mail } from '@lucide/svelte';
    import { externalLogin, isPasskeyCancellation, login, passkeyLogin, passkeysSupported } from '$lib/api/auth';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Form } from '$lib/forms/form.svelte';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import AuthLayout from './AuthLayout.svelte';
    import { captchaPayload } from './captcha';
    import { afterLogin, authState } from './state.svelte';

    /**
     * Sign in, ported from LoginContainer.tsx. Differences: a failed SSO request shows its
     * error on this page (the legacy page flashed it under a key nothing rendered); a
     * captcha failure on an SSO button is reported instead of logged.
     */
    const notice = authState.notice;
    authState.notice = '';

    const modules = $derived(app.flags?.auth.modules);
    const registration = $derived(Boolean(app.flags?.auth.registration.enabled));
    const name = $derived(app.settings?.name || 'Jexactyl');

    const form = new Form({
        schema: z.object({
            user: z.string().trim().min(1, '请输入用户名或邮箱。'),
            password: z.string().min(1, '请输入密码。'),
        }),
        initial: { user: '', password: '' },
        onSubmit: async ({ user, password }) => {
            const response = await login(user, password, await captchaPayload('login'));
            if (response.complete) {
                window.location.assign(afterLogin(response.intended));
                return;
            }
            authState.checkpointToken = response.confirmationToken ?? '';
            navigate('/auth/login/checkpoint');
        },
    });

    let other = $state<'passkey' | 'discord' | 'google' | null>(null);
    let otherError = $state('');

    async function withPasskey() {
        other = 'passkey';
        otherError = '';
        try {
            const response = await passkeyLogin();
            window.location.assign(afterLogin(response.intended));
        } catch (e) {
            if (!isPasskeyCancellation(e)) otherError = httpErrorToHuman(e);
            other = null;
        }
    }

    async function withProvider(provider: 'discord' | 'google') {
        other = provider;
        otherError = '';
        try {
            window.location.assign(await externalLogin(provider, await captchaPayload('login')));
        } catch (e) {
            otherError = httpErrorToHuman(e);
            other = null;
        }
    }

    const busy = $derived(form.submitting || other !== null);
</script>

<AuthLayout title="登录 {name}">
    <form class="space-y-4" onsubmit={e => form.submit(e)} novalidate>
        {#if notice}<Alert variant="success">{notice}</Alert>{/if}
        {#if form.errors._ || otherError}<Alert variant="destructive">{form.errors._ || otherError}</Alert>{/if}
        <div class="space-y-1.5">
            <Label for="login-user">用户名或邮箱</Label>
            <Input id="login-user" name="username" autocomplete="username" bind:value={form.values.user} error={form.errors.user} disabled={busy} oninput={() => form.clearError('user')} />
        </div>
        <div class="space-y-1.5">
            <div class="flex items-center justify-between">
                <Label for="login-password">密码</Label>
                <Link href="/auth/password" class="text-xs text-primary hover:underline" tabindex={-1}>忘记密码？</Link>
            </div>
            <Input id="login-password" name="password" type="password" autocomplete="current-password" bind:value={form.values.password} error={form.errors.password} disabled={busy} oninput={() => form.clearError('password')} />
        </div>
        <Button type="submit" class="w-full" loading={form.submitting} disabled={busy}><LogIn />登录</Button>
        {#if passkeysSupported()}
            <Button type="button" variant="outline" class="w-full" loading={other === 'passkey'} disabled={busy} onclick={withPasskey}><Fingerprint />使用通行密钥登录</Button>
        {/if}
    </form>

    {#if modules?.discord.enabled || modules?.google.enabled || registration}
        <div class="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span class="h-px flex-1 bg-border"></span>或<span class="h-px flex-1 bg-border"></span></div>
        <div class="grid gap-2">
            {#if modules?.discord.enabled}<Button variant="outline" loading={other === 'discord'} disabled={busy} onclick={() => withProvider('discord')}>使用 Discord 登录</Button>{/if}
            {#if modules?.google.enabled}<Button variant="outline" loading={other === 'google'} disabled={busy} onclick={() => withProvider('google')}>使用 Google 登录</Button>{/if}
            {#if registration}<Button variant="ghost" href="/auth/register" disabled={busy}><Mail />用邮箱注册</Button>{/if}
        </div>
    {/if}
</AuthLayout>
