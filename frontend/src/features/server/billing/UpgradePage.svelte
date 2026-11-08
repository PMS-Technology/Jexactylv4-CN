<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { ArrowLeft, ShoppingBag } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import type { Product } from '$lib/api/definitions/billing';
    import { getUpgradeCharge, getUpgradeOptions, processUpgrade } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import ProductLimits from '$features/dashboard/billing/components/ProductLimits.svelte';
    import { Button, buttonVariants, Card, Spinner } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /**
     * Upgrade options, ported from UpgradeContainer.tsx. Picking a product fetches the
     * pro-rata charge, and confirming sends the customer to Stripe Checkout; the webhook
     * applies the new limits once the payment completes.
     */
    let { store }: { store: ServerStore } = $props();

    const server = $derived(store.server!);

    const options = createQuery(() => ({
        queryKey: ['server', server.uuid, 'upgrade-options'],
        queryFn: () => getUpgradeOptions(server.uuid),
        retry: false,
    }));

    let selected = $state<Product | null>(null);
    let open = $state(false);

    const charge = createQuery(() => ({
        queryKey: ['server', server.uuid, 'upgrade-charge', selected?.id ?? 0],
        queryFn: () => getUpgradeCharge(server.uuid, selected!.id),
        enabled: Boolean(selected),
        retry: false,
        // The charge shrinks every minute; don't reuse a stale figure.
        gcTime: 0,
    }));

    let submitting = $state(false);
    let submitError = $state('');

    function configure(product: Product) {
        selected = product;
        submitError = '';
        open = true;
    }

    async function submit() {
        if (!selected || submitting) return;

        submitting = true;
        submitError = '';
        try {
            window.location.assign(await processUpgrade(server.uuid, selected.id));
        } catch (e) {
            submitError = httpErrorToHuman(e);
            submitting = false;
        }
    }
</script>

<svelte:head>
    <title>升级选项 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="升级选项" description="查看当前套餐并升级到新的方案。">
        <Link href="/server/{server.id}/billing" class={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft /> 返回计费
        </Link>
    </PageHeader>

    {#if options.error}
        <Alert variant="destructive">{httpErrorToHuman(options.error)}</Alert>
    {:else if !options.data}
        <Spinner centered />
    {:else if !options.data.length}
        <Alert>没有可升级的套餐。如需升级，请联系管理员。</Alert>
    {:else}
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {#each options.data as product (product.id)}
                <Card class="flex flex-col p-6">
                    <div class="flex justify-center">
                        {#if product.icon}
                            <img src={product.icon} alt="" class="size-16 object-contain" />
                        {:else}
                            <ShoppingBag class="size-12 text-primary" />
                        {/if}
                    </div>
                    <p class="mt-3 text-center text-2xl font-bold">{product.name}</p>
                    <p class="mt-1 mb-4 text-center text-lg font-semibold text-primary">
                        {formatMoney(product.price)}
                        <span class="text-sm font-normal text-muted-foreground">/ 月</span>
                    </p>
                    <ProductLimits limits={product.limits} />
                    <Button size="lg" class="mt-6 w-full" onclick={() => configure(product)}>选择此套餐</Button>
                </Card>
            {/each}
        </div>
    {/if}
</div>

{#if selected}
    <Dialog
        bind:open
        title="确认升级到 {selected.name}（{formatMoney(selected.price)} / 月）"
        preventClose={submitting}
        class="max-w-lg"
    >
        <div class="space-y-4 text-sm">
            {#if submitError}
                <Alert variant="destructive">{submitError}</Alert>
            {/if}
            {#if charge.error}
                <Alert variant="destructive">{httpErrorToHuman(charge.error)}</Alert>
            {/if}
            <p class="text-muted-foreground">
                在计费周期中途升级需要先支付下面这笔一次性费用。付款后服务器立即切换到新套餐，之后按新套餐价格续期。
            </p>
            <div class="flex flex-wrap items-center gap-2">
                <code class="rounded-md bg-muted px-2 py-1 font-mono">
                    {#if charge.data !== undefined}
                        {formatMoney(charge.data)}
                    {:else if charge.isFetching}
                        <Spinner size="sm" class="inline-block align-middle" />
                    {:else}
                        —
                    {/if}
                </code>
                <span class="text-muted-foreground italic">提前升级的一次性费用，立即扣取</span>
            </div>
            {#if server.renewalDate}
                <p class="text-muted-foreground">
                    从 {server.renewalDate.toLocaleDateString()} 起，续期费用将变为 {formatMoney(selected.price)} / 月。
                </p>
            {/if}
        </div>

        {#snippet footer()}
            <Button variant="ghost" size="sm" disabled={submitting} onclick={() => (open = false)}>取消</Button>
            <!-- A zero charge means no time is left in the cycle; Stripe rejects a 0 amount. -->
            <Button size="sm" loading={submitting} disabled={!charge.data} onclick={submit}>立即升级</Button>
        {/snippet}
    </Dialog>
{/if}
