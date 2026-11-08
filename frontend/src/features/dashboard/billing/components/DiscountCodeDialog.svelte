<script lang="ts">
    import { validateDiscountCode } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { DiscountCode } from '$lib/api/definitions/billing';
    import { Button, Dialog, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import { formatMoney } from '../money';

    type Props = { open?: boolean; code: DiscountCode | null; onApply: (code: DiscountCode | null) => void };

    let { open = $bindable(false), code, onApply }: Props = $props();

    let input = $state('');
    let error = $state('');
    let checking = $state(false);

    // ValidateDiscountCodeRequest: 4–16 characters.
    const valid = $derived(input.trim().length >= 4 && input.trim().length <= 16);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || checking) return;

        checking = true;
        error = '';
        try {
            onApply(await validateDiscountCode(input.trim()));
            input = '';
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            checking = false;
        }
    }
</script>

<Dialog bind:open title="使用优惠码" description="如果你有本次订单可用的优惠码，可以在这里使用。" preventClose={checking}>
    {#if code}
        <div class="space-y-3">
            <div class="rounded-md border border-border p-3">
                <p class="font-mono text-sm font-medium">{code.code}</p>
                <p class="mt-0.5 text-xs text-success">
                    优惠 {code.type === 'percentage' ? `${code.value}%` : formatMoney(code.value)}
                </p>
                {#if code.description}
                    <p class="mt-1 text-xs text-muted-foreground">{code.description}</p>
                {/if}
            </div>
        </div>
    {:else}
        <form id="discount-form" class="space-y-3" onsubmit={submit} novalidate>
            {#if error}
                <Alert variant="destructive">{error}</Alert>
            {/if}
            <div>
                <Label for="discount-code">优惠码</Label>
                <Input id="discount-code" bind:value={input} placeholder="SAVE20" maxlength={16} autocomplete="off" />
            </div>
        </form>
    {/if}

    {#snippet footer()}
        {#if code}
            <Button variant="ghost" size="sm" onclick={() => onApply(null)}>移除优惠码</Button>
            <Button size="sm" onclick={() => (open = false)}>完成</Button>
        {:else}
            <Button variant="ghost" size="sm" disabled={checking} onclick={() => (open = false)}>取消</Button>
            <Button type="submit" form="discount-form" size="sm" loading={checking} disabled={!valid}>验证</Button>
        {/if}
    {/snippet}
</Dialog>
