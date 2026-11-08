<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { ArrowLeft, Ban } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import type { Product } from '$lib/api/definitions/billing';
    import { billingKeys, getProduct, processFreeOrder } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import { Button, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import PaymentButton from './PaymentButton.svelte';

    let { store }: { store: ServerStore } = $props();

    /**
     * Renewal-overdue lock screen, ported from ScreenBlock's `Suspended` component: a
     * billable server past its renewal date can only be renewed (or ticketed about)
     * until an administrator intervenes.
     */
    const productId = $derived(store.server?.billingProductId);

    const productQuery = createQuery(() => ({
        queryKey: billingKeys.product(productId ?? 0),
        queryFn: () => getProduct(productId!),
        enabled: Boolean(productId),
    }));

    const product = $derived(productQuery.data as Product | undefined);

    const isFree = $derived(product ? product.price === 0 : false);
    const threshold = $derived(app.flags?.billing.renewal.threshold ?? 30);

    const daysOverdue = $derived.by(() => {
        const date = store.server?.renewalDate;
        if (!date) return 0;

        return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
    });
    const isLongOverdue = $derived(daysOverdue > threshold);

    let renewing = $state(false);
    let error = $state('');

    async function renewFree() {
        if (!product || renewing) return;

        renewing = true;
        error = '';
        try {
            await processFreeOrder({
                productId: product.id,
                variables: [],
                // The backend reads server_id to mark this as a renewal, not a new order.
                serverId: Number(store.server!.internalId),
            });
            navigate(`/server/${store.server!.uuid}`);
        } catch (e) {
            error = httpErrorToHuman(e);
            renewing = false;
        }
    }
</script>

<div class="flex min-h-screen items-center justify-center p-6">
    <div class="relative w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-lg md:p-12">
        <Button
            variant="ghost"
            size="icon"
            class="absolute top-4 left-4"
            aria-label="返回"
            onclick={() => navigate('/')}
        >
            <ArrowLeft class="size-4" />
        </Button>

        {#if productQuery.isPending}
            <Spinner centered />
        {:else if !product}
            <div class="space-y-4 text-center">
                <Ban class="mx-auto size-10 text-destructive" />
                <h1 class="font-header text-2xl font-bold">服务器已被停用</h1>
                <p class="text-sm text-muted-foreground">
                    此服务器关联的套餐已不存在，无法自助续期。请联系管理员恢复访问。
                </p>
            </div>
        {:else}
            <div class="space-y-4">
                <h1 class="font-header text-2xl font-bold">
                    {isFree ? '服务器已被停用' : '服务器已被停用 — 未付款'}
                </h1>

                {#if error}
                    <Alert variant="destructive">{error}</Alert>
                {/if}

                {#if isLongOverdue}
                    <p class="text-sm text-muted-foreground">
                        你的{isFree ? '免费' : ''}服务器因逾期未续期已被停用超过 {threshold} 天。
                        <span class="font-medium text-destructive">请创建工单以恢复访问。</span>
                        {threshold} 天后自助续期将不再可用。
                    </p>
                {:else}
                    <p class="text-sm text-muted-foreground">
                        你的{isFree ? '免费' : ''}服务器已超过续期日期，请续期以恢复访问。
                    </p>
                    <p class="text-sm font-semibold text-warning">已逾期 {daysOverdue} 天</p>

                    {#if isFree}
                        <Button loading={renewing} onclick={renewFree}>续期服务器</Button>
                    {:else}
                        <!-- Paid inline like the legacy screen: ServerArea renders this lock
                             screen for every subpage, the billing page included. -->
                        <p class="text-sm text-muted-foreground">
                            待付金额：<span class="font-semibold text-foreground">{formatMoney(product.price)}</span>
                        </p>
                        <PaymentButton {product} server={store.server!} />
                    {/if}
                {/if}
            </div>
        {/if}
    </div>
</div>
