<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { formatDistanceToNowStrict } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ArrowRight, Box, CalendarCheck, CircleCheck, Hourglass, TriangleAlert } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import type { Product } from '$lib/api/definitions/billing';
    import { billingKeys, getOrders, getProduct, processFreeOrder } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { formatMoney } from '$features/dashboard/billing/money';
    import InvoiceButton from '$features/dashboard/billing/components/InvoiceButton.svelte';
    import { Button, buttonVariants, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import PaymentButton from './PaymentButton.svelte';
    import RadialProgress from './RadialProgress.svelte';

    /**
     * Server billing, ported from ServerBillingContainer.tsx: plan summary, renewal
     * countdown, this server's orders, renewal (free or Stripe) and the upgrade entry.
     */
    let { store }: { store: ServerStore } = $props();

    const server = $derived(store.server!);
    const settings = $derived(app.flags!.billing);

    const productQuery = createQuery(() => ({
        queryKey: billingKeys.product(server.billingProductId ?? 0),
        queryFn: () => getProduct(server.billingProductId!),
        enabled: Boolean(server.billingProductId),
        retry: false,
    }));
    const product = $derived(productQuery.data as Product | undefined);

    // Same arithmetic as the legacy `timeUntil`, floored per unit.
    const remaining = $derived.by(() => {
        if (!server.renewalDate) return null;
        const ms = server.renewalDate.getTime() - Date.now();

        return { days: Math.floor(ms / 86_400_000), hours: Math.floor((ms / 3_600_000) % 24) };
    });
    const daysRemaining = $derived(remaining?.days ?? 0);
    const healthy = $derived(daysRemaining > settings.renewal.threshold);

    // Free servers can only be renewed in the final week, as the legacy page enforced.
    const canRenewFree = $derived(daysRemaining - 7 <= 0);

    let renewing = $state(false);
    let renewError = $state('');

    async function renewFree() {
        if (!product || renewing) return;

        renewing = true;
        renewError = '';
        try {
            await processFreeOrder({ productId: product.id, variables: [], serverId: Number(server.internalId) });
            await store.refetch();
        } catch (e) {
            renewError = httpErrorToHuman(e);
        } finally {
            renewing = false;
        }
    }

    // --- Orders bound to this server.
    let page = $state(1);
    const ordersQuery = createQuery(() => ({
        queryKey: [...billingKeys.orders, 'server', server.internalId, page],
        queryFn: () => getOrders({ page, filters: { server_id: Number(server.internalId) } }, 10),
        placeholderData: keepPreviousData,
    }));
    let invoiceError = $state('');

    const typeLabel = { new: '新购', renewal: '续费', upgrade: '升级' } as const;
    const statusLabel = {
        processed: '已完成',
        processing: '处理中',
        pending: '待支付',
        failed: '失败',
        expired: '已过期',
    } as const;
</script>

<svelte:head>
    <title>服务器计费 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="服务器计费" description="管理此服务器的续期与套餐。" />

    {#if productQuery.isError}
        <Alert variant="warning" class="mb-6">最初购买的套餐已不存在，部分信息无法显示。</Alert>
    {/if}

    {#if remaining}
        <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {#each [
                { icon: Box, label: '套餐', value: product?.name ?? (productQuery.isPending ? '…' : '未知') },
                { icon: CalendarCheck, label: '费用', value: product ? formatMoney(product.price) : '…', caption: `每 ${settings.renewal.days} 天` },
                { icon: Hourglass, label: '距续期', value: `${daysRemaining} 天` },
                { icon: healthy ? CircleCheck : TriangleAlert, label: '状态', value: healthy ? '正常' : '即将续期' },
            ] as tile (tile.label)}
                {@const Icon = tile.icon}
                <Card class="flex items-center gap-3 p-4">
                    <Icon class="size-5 shrink-0 text-muted-foreground" />
                    <div class="min-w-0">
                        <p class="text-xs text-muted-foreground">{tile.label}</p>
                        <p class="truncate text-lg font-semibold">{tile.value}</p>
                        {#if tile.caption}<p class="text-2xs text-muted-foreground">{tile.caption}</p>{/if}
                    </div>
                </Card>
            {/each}
        </div>
    {/if}

    <div class="grid gap-4 lg:grid-cols-3">
        {#if !remaining}
            <Alert variant="warning">此服务器没有续期日期。</Alert>
        {:else}
            <Card>
                <CardHeader><CardTitle>概览</CardTitle></CardHeader>
                <CardContent class="space-y-6 text-sm">
                    <div class="flex items-center gap-6">
                        <RadialProgress
                            value={((settings.renewal.days - daysRemaining) / settings.renewal.days) * 100}
                        >
                            <div class="text-center">
                                <p class="text-lg leading-none font-bold">{daysRemaining}天</p>
                                <p class="mt-1 text-2xs text-muted-foreground">剩余</p>
                            </div>
                        </RadialProgress>
                        <div>
                            <p class="font-medium">下次续期</p>
                            <p class="text-muted-foreground">
                                {server.renewalDate!.toLocaleDateString()} · {remaining.days} 天 {remaining.hours} 小时
                            </p>
                        </div>
                    </div>
                    <div>
                        <p class="font-medium">你的套餐</p>
                        <p class="text-muted-foreground">{product?.name ?? '未知'}</p>
                        {#if product?.description}<p class="text-xs text-muted-foreground/80">{product.description}</p>{/if}
                    </div>
                    <div>
                        <p class="font-medium">套餐费用</p>
                        <div class="flex items-center justify-between">
                            <p class="text-muted-foreground">
                                {product ? formatMoney(product.price) : '…'} / {settings.renewal.days} 天
                            </p>
                            <Link href="/account/billing/orders" class="inline-flex items-center gap-1 text-xs text-primary">
                                查看订单 <ArrowRight class="size-3" />
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        {/if}

        <Card class="lg:col-span-2">
            <CardHeader><CardTitle>相关订单</CardTitle></CardHeader>
            <CardContent class="p-0">
                {#if invoiceError}
                    <div class="px-4 pb-4"><Alert variant="destructive">{invoiceError}</Alert></div>
                {/if}
                {#if ordersQuery.error}
                    <div class="px-4 pb-4"><Alert variant="destructive">{httpErrorToHuman(ordersQuery.error)}</Alert></div>
                {:else if !ordersQuery.data}
                    <Spinner centered />
                {:else if !ordersQuery.data.items.length}
                    <p class="py-10 text-center text-sm text-muted-foreground">此服务器还没有订单。</p>
                {:else}
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="border-y border-border text-left text-xs text-muted-foreground">
                                <tr>
                                    <th scope="col" class="px-4 py-2 font-medium">ID</th>
                                    <th scope="col" class="px-4 py-2 font-medium">金额</th>
                                    <th scope="col" class="px-4 py-2 font-medium">类型</th>
                                    <th scope="col" class="px-4 py-2 font-medium">状态</th>
                                    <th scope="col" class="px-4 py-2 font-medium">创建时间</th>
                                    <th scope="col" class="px-4 py-2 text-center font-medium">发票</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                {#each ordersQuery.data.items as order (order.id)}
                                    <tr>
                                        <td class="px-4 py-3 font-mono text-xs">{order.id}</td>
                                        <td class="px-4 py-3 font-medium whitespace-nowrap">{formatMoney(order.total)}</td>
                                        <td class="px-4 py-3">{typeLabel[order.type] ?? order.type}</td>
                                        <td class="px-4 py-3">{statusLabel[order.status] ?? order.status}</td>
                                        <td class="px-4 py-3 whitespace-nowrap text-muted-foreground" title={formatDateTime(order.createdAt)}>
                                            {formatDistanceToNowStrict(order.createdAt, { addSuffix: true, locale: zhCN })}
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <InvoiceButton {order} onError={m => (invoiceError = m)} />
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                    <div class="px-4 pb-4">
                        <Pagination pagination={ordersQuery.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
                    </div>
                {/if}
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>续期服务器</CardTitle></CardHeader>
            <CardContent class="space-y-4 text-sm">
                {#if productQuery.isPending}
                    <Spinner />
                {:else if !product}
                    <Alert variant="destructive">创建此服务器的套餐已不存在。如需续期，请联系管理员。</Alert>
                {:else if product.price === 0}
                    {#if renewError}
                        <Alert variant="destructive">{renewError}</Alert>
                    {/if}
                    <p>这是一台免费服务器。请在 {daysRemaining} 天后到期前续期，否则服务器将被永久删除。</p>
                    {#if canRenewFree}
                        <Button size="lg" loading={renewing} onclick={renewFree}>续期服务器</Button>
                    {:else}
                        <p class="text-muted-foreground">
                            到期前 7 天内才能续期（还需等待 {daysRemaining - 7} 天）。
                        </p>
                    {/if}
                {:else if server.renewalDate}
                    <PaymentButton {product} {server} />
                {/if}
            </CardContent>
        </Card>

        {#if settings.allow_upgrades}
            <Card class="lg:col-span-2">
                <CardHeader><CardTitle>升级套餐</CardTitle></CardHeader>
                <CardContent class="space-y-6 text-sm text-muted-foreground">
                    <p>
                        如需为服务器购买更多资源，可以选择一个新套餐。系统会按比例计算从现在到下次续期日之间的差价，付款后新资源立即生效。
                    </p>
                    <div class="text-right">
                        <Link href="/server/{server.id}/billing/upgrade" class={buttonVariants({ size: 'lg' })}>
                            查看升级选项 <ArrowRight class="size-4" />
                        </Link>
                    </div>
                </CardContent>
            </Card>
        {/if}
    </div>
</div>
