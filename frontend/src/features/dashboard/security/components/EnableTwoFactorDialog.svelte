<script lang="ts">
    import { renderSVG } from 'uqr';
    import { app } from '$lib/stores/app.svelte';
    import { enableTwoFactor, getTwoFactorTokenData } from '$lib/api/security';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { TwoFactorTokenData } from '$lib/api/definitions/account';
    import { Button, Dialog, Input, Label, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';

    type Props = { open?: boolean; onEnabled: (tokens: string[]) => void };

    let { open = $bindable(false), onEnabled }: Props = $props();

    let token = $state<TwoFactorTokenData | null>(null);
    let code = $state('');
    let password = $state('');
    let error = $state('');
    let submitting = $state(false);

    // The parent mounts this dialog only while it is open, so each opening generates a
    // fresh secret, as the legacy dialog did.
    getTwoFactorTokenData()
        .then(data => (token = data))
        .catch(e => (error = httpErrorToHuman(e)));

    // The secret comes from our own backend and renderSVG emits only rect markup, so
    // injecting the string is safe.
    const qr = $derived(token ? renderSVG(token.image_url_data, { border: 1 }) : '');
    const canSubmit = $derived(Boolean(token) && /^\d{6}$/.test(code) && password.length > 0);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!canSubmit || submitting) return;

        submitting = true;
        error = '';
        try {
            const tokens = await enableTwoFactor(code, password);
            app.updateUser({ useTotp: true });
            onEnabled(tokens);
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            submitting = false;
        }
    }
</script>

<Dialog
    bind:open
    title="启用两步验证"
    description="防止账号被未授权访问。启用后，每次登录都需要输入验证码。"
    preventClose={submitting}
>
    <form id="enable-totp-form" class="space-y-4" onsubmit={submit} novalidate>
        {#if error}
            <Alert variant="destructive">{error}</Alert>
        {/if}

        <div class="mx-auto flex size-48 items-center justify-center rounded-md bg-white p-2">
            {#if qr}
                <div class="size-full [&_svg]:size-full">{@html qr}</div>
            {:else if !error}
                <Spinner />
            {/if}
        </div>

        {#if token}
            <div class="flex items-center justify-center gap-2">
                <code class="font-mono text-sm">{token.secret.match(/.{1,4}/g)?.join(' ')}</code>
                <CopyButton text={token.secret} />
            </div>
        {/if}

        <div>
            <Label for="totp-code">验证码</Label>
            <p id="totp-code-description" class="mb-1.5 text-xs text-muted-foreground">
                用验证器应用扫描上方二维码，然后输入生成的 6 位代码。
            </p>
            <Input
                id="totp-code"
                aria-describedby="totp-code-description"
                bind:value={code}
                placeholder="000000"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength={6}
            />
        </div>

        <div>
            <Label for="totp-password">账号密码</Label>
            <Input id="totp-password" type="password" autocomplete="current-password" bind:value={password} />
        </div>
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={submitting} onclick={() => (open = false)}>取消</Button>
        <Button type="submit" form="enable-totp-form" size="sm" loading={submitting} disabled={!canSubmit}>
            启用
        </Button>
    {/snippet}
</Dialog>
