<script lang="ts">
    import { app } from '$lib/stores/app.svelte';
    import { disableTwoFactor } from '$lib/api/security';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Dialog, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    let { open = $bindable(false) }: { open?: boolean } = $props();

    let password = $state('');
    let error = $state('');
    let submitting = $state(false);

    function onOpenChange(next: boolean) {
        if (!next) {
            password = '';
            error = '';
        }
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!password || submitting) return;

        submitting = true;
        error = '';
        try {
            await disableTwoFactor(password);
            app.updateUser({ useTotp: false });
            open = false;
            onOpenChange(false);
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            submitting = false;
        }
    }
</script>

<Dialog
    bind:open
    title="停用两步验证"
    description="停用两步验证会降低账号的安全性。"
    preventClose={submitting}
    {onOpenChange}
>
    <form id="disable-totp-form" class="space-y-4" onsubmit={submit} novalidate>
        {#if error}
            <Alert variant="destructive">{error}</Alert>
        {/if}
        <div>
            <Label for="disable-totp-password">账号密码</Label>
            <Input id="disable-totp-password" type="password" autocomplete="current-password" bind:value={password} />
        </div>
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={submitting} onclick={() => (open = false)}>取消</Button>
        <Button
            type="submit"
            form="disable-totp-form"
            variant="destructive"
            size="sm"
            loading={submitting}
            disabled={!password}
        >
            停用
        </Button>
    {/snippet}
</Dialog>
