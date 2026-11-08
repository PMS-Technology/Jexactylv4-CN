<script lang="ts">
    import { ExternalLink } from '@lucide/svelte';
    import { updateBillingSetting } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Stripe secret key entry, ported from guides/SetupStripe.tsx. The legacy dialog
     * reloaded the page after saving; the `keys.secret` flag is patched in place.
     */
    let { open = $bindable(false) }: { open?: boolean } = $props();

    let secret = $state('');
    let saving = $state(false);
    let error = $state('');

    $effect(() => {
        if (open) {
            secret = '';
            error = '';
        }
    });

    // Stripe secret keys are around 107 characters. Like the legacy dialog this only
    // warns, since Stripe does not document a fixed length.
    const looksValid = $derived(secret.trim().length >= 100 && secret.trim().length <= 120);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!secret.trim() || saving) return;

        saving = true;
        error = '';
        try {
            await updateBillingSetting('keys:secret', secret.trim());
            app.updateFlags({ billing: { ...app.flags!.billing, keys: { secret: true } } });
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<Dialog bind:open title="配置 Stripe API" preventClose={saving}>
    <form id="stripe-key-form" class="space-y-4 text-sm" onsubmit={submit}>
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}
        <Alert title="还在配置中？">可以先关闭此窗口，继续设置商品分类和套餐。准备好后，在“设置”标签页填写 API 密钥。</Alert>
        <p class="text-muted-foreground">
            使用 Stripe 收款前，需要为面板提供 Stripe 的 Secret Key。请在
            <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" class="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline">
                Stripe 控制台 <ExternalLink class="size-3" />
            </a>
            获取后粘贴到这里。
        </p>
        <div>
            <Input
                bind:value={secret}
                aria-label="Stripe Secret Key"
                placeholder="sk_live_…"
                autocomplete="off"
                disabled={saving}
                class="font-mono"
            />
            {#if secret.trim() && !looksValid}
                <p class="mt-1.5 text-xs text-warning">这看起来不是有效的 Stripe Secret Key（通常约 107 个字符），请确认后再提交。</p>
            {/if}
        </div>
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (open = false)}>稍后再说</Button>
        <Button type="submit" form="stripe-key-form" size="sm" loading={saving} disabled={!secret.trim()}>保存</Button>
    {/snippet}
</Dialog>
