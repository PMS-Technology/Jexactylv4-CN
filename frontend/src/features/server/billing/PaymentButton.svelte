<script lang="ts">
    import { CreditCard } from '@lucide/svelte';
    import type { Product } from '$lib/api/definitions/billing';
    import type { Server } from '$lib/api/definitions/server';
    import { createCheckoutSession } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Paid renewal, ported from ServerPaymentButton.tsx: opens a Stripe Checkout session
     * bound to this server (no node, so the backend books it as a renewal).
     */
    let { product, server }: { product: Product; server: Server } = $props();

    const days = $derived(app.flags?.billing.renewal.days ?? 30);
    const nextDate = $derived(
        server.renewalDate ? new Date(server.renewalDate.getTime() + days * 86_400_000) : null,
    );

    let loading = $state(false);
    let error = $state('');

    async function pay() {
        loading = true;
        error = '';
        try {
            const url = await createCheckoutSession({
                productId: product.id,
                serverId: Number(server.internalId),
                variables: [],
            });
            window.location.assign(url);
        } catch (e) {
            error = httpErrorToHuman(e);
            loading = false;
        }
    }
</script>

<div class="space-y-4 text-sm">
    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {/if}
    <p class="text-muted-foreground">
        现在续费会为服务器增加 {days} 天{#if nextDate}，续期日变为 {nextDate.toLocaleDateString()}{/if}。
    </p>
    <div class="text-right">
        <Button size="lg" {loading} onclick={pay}>立即付款 <CreditCard /></Button>
    </div>
</div>
