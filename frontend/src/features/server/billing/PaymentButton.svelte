<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { CreditCard } from '@lucide/svelte';
    import type { Product } from '$lib/api/definitions/billing';
    import type { Server } from '$lib/api/definitions/server';
    import { billingKeys, createCheckoutSession, getPaymentMethods, submitCheckout } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Spinner } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PaymentMethodPicker from '$features/dashboard/billing/components/PaymentMethodPicker.svelte';

    /**
     * Paid renewal, ported from ServerPaymentButton.tsx: opens a hosted checkout session
     * bound to this server (no node, so the backend books it as a renewal).
     *
     * The customer picks how they want to pay, because several payment methods can be
     * on offer at the same time.
     */
    let { product, server }: { product: Product; server: Server } = $props();

    const days = $derived(app.flags?.billing.renewal.days ?? 30);
    const nextDate = $derived(
        server.renewalDate ? new Date(server.renewalDate.getTime() + days * 86_400_000) : null,
    );

    const methodsQuery = createQuery(() => ({
        queryKey: billingKeys.paymentMethods,
        queryFn: getPaymentMethods,
    }));
    const methods = $derived(methodsQuery.data ?? []);

    let open = $state(false);
    let choice = $state<string | null>(null);
    // The first method is preselected, the way the node list picks its first entry.
    const method = $derived(methods.find(m => m.identifier === choice) ?? methods[0] ?? null);

    let loading = $state(false);
    let error = $state('');

    async function pay() {
        if (loading || !method) return;

        loading = true;
        error = '';
        try {
            const target = await createCheckoutSession({
                productId: product.id,
                serverId: Number(server.internalId),
                variables: [],
                paymentMethod: method.identifier,
            });
            submitCheckout(target);
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
        <Button size="lg" onclick={() => (open = true)}>立即付款 <CreditCard /></Button>
    </div>
</div>

<Dialog bind:open title="选择支付方式" preventClose={loading} class="max-w-lg">
    {#if methodsQuery.isPending}
        <Spinner centered />
    {:else if !methods.length}
        <Alert variant="destructive">目前没有可用的支付方式，请联系管理员。</Alert>
    {:else}
        <PaymentMethodPicker {methods} value={method?.identifier ?? null} onChange={identifier => (choice = identifier)} />
    {/if}

    {#if error}
        <div class="mt-4"><Alert variant="destructive">{error}</Alert></div>
    {/if}

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={loading} onclick={() => (open = false)}>取消</Button>
        <Button size="sm" loading={loading} disabled={!method} onclick={pay}>去支付</Button>
    {/snippet}
</Dialog>
