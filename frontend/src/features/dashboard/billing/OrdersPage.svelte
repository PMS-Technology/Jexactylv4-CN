<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { formatDistanceToNowStrict } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ArrowDown, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, Search, XCircle } from '@lucide/svelte';
    import { billingKeys, getOrders, type OrderQuery } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { OrderStatus, OrderType } from '$lib/api/definitions/billing';
    import { app } from '$lib/stores/app.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, CardContent, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import InvoiceButton from './components/InvoiceButton.svelte';
    import { formatMoney } from './money';

    const statusMeta: Record<OrderStatus, { label: string; class: string }> = {
        processed: { label: '已完成', class: 'bg-success/15 text-success' },
        processing: { label: '处理中', class: 'bg-warning/15 text-warning' },
        pending: { label: '待支付', class: 'bg-warning/15 text-warning' },
        failed: { label: '失败', class: 'bg-destructive/15 text-destructive' },
        expired: { label: '已过期', class: 'bg-muted text-muted-foreground' },
    };
    const typeLabel: Record<OrderType, string> = { new: '新购', renewal: '续费', upgrade: '升级' };

    // --- Account-wide stats, from up to the API's 100-order page limit like the legacy page.
    const statsQuery = createQuery(() => ({
        queryKey: [...billingKeys.orders, 'stats'],
        queryFn: () => getOrders({}, 100),
    }));

    const stats = $derived.by(() => {
        const orders = statsQuery.data?.items;
        if (!orders) return null;

        const active = new Set<number>();
        let monthly = 0;
        let lifetime = 0;
        let pending = 0;

        // Orders arrive newest first, so the first order seen per server carries its current price.
        for (const order of orders) {
            if (order.status === 'pending') pending++;
            if (order.status === 'processed') lifetime += order.total;
            if (order.serverId && order.server && !active.has(order.serverId)) {
                active.add(order.serverId);
                monthly += order.total;
            }
        }

        return { active: active.size, monthly, lifetime, pending };
    });

    // --- Paginated table.
    let page = $state(1);
    let search = $state('');
    let debounced = $state('');
    let sort = $state<{ key: 'id' | 'total' | 'type' | 'created_at'; dir: 'asc' | 'desc' } | null>(null);

    $effect(() => {
        const value = search.trim();
        const timer = setTimeout(() => {
            // The legacy table ignored queries shorter than two characters.
            debounced = value.length >= 2 ? value : '';
            page = 1;
        }, 300);

        return () => clearTimeout(timer);
    });

    const params = $derived<OrderQuery>({
        page,
        filters: { name: debounced || undefined },
        sorts: sort ? { [sort.key]: sort.dir } : {},
    });

    const ordersQuery = createQuery(() => ({
        queryKey: [...billingKeys.orders, params],
        queryFn: () => getOrders(params),
        placeholderData: keepPreviousData,
    }));

    const pagination = $derived(ordersQuery.data?.pagination);

    function toggleSort(key: NonNullable<typeof sort>['key']) {
        sort = sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null;
        page = 1;
    }

    let actionError = $state('');
</script>

{#snippet sortHeader(key: NonNullable<typeof sort>['key'], label: string)}
    <th scope="col" class="px-4 py-2 font-medium" aria-sort={sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort(key)}>
            {label}
            {#if sort?.key === key}
                {#if sort.dir === 'asc'}<ArrowUp class="size-3" />{:else}<ArrowDown class="size-3" />{/if}
            {/if}
        </button>
    </th>
{/snippet}

<svelte:head>
    <title>订单 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="订单" description="查看你创建过的订阅与付款记录。" />

    <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {#each [
            { label: '有效服务', value: stats ? String(stats.active) : null },
            { label: '每月费用', value: stats ? formatMoney(stats.monthly) : null },
            { label: '累计消费', value: stats ? formatMoney(stats.lifetime) : null },
            { label: '待支付订单', value: stats ? String(stats.pending) : null },
        ] as tile (tile.label)}
            <Card class="p-4">
                <p class="text-xs text-muted-foreground">{tile.label}</p>
                <p class="mt-1 text-lg font-semibold">{tile.value ?? '…'}</p>
            </Card>
        {/each}
    </div>

    <Card>
        <CardContent class="p-0">
            <div class="flex items-center gap-2 border-b border-border p-4">
                <div class="relative w-full max-w-xs">
                    <Search class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        bind:value={search}
                        placeholder="按名称搜索订单"
                        aria-label="按名称搜索订单"
                        class="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
                {#if ordersQuery.isFetching && ordersQuery.data}
                    <Spinner size="sm" />
                {/if}
            </div>

            {#if actionError}
                <div class="p-4 pb-0"><Alert variant="destructive">{actionError}</Alert></div>
            {/if}

            {#if ordersQuery.error}
                <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(ordersQuery.error)}</Alert></div>
            {:else if !ordersQuery.data}
                <Spinner centered />
            {:else if !ordersQuery.data.items.length}
                <p class="py-12 text-center text-sm text-muted-foreground">
                    {debounced ? '没有匹配的订单。' : '你还没有任何订单。'}
                </p>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border text-left text-xs text-muted-foreground">
                            <tr>
                                {@render sortHeader('id', 'ID')}
                                {@render sortHeader('total', '金额')}
                                <th scope="col" class="px-4 py-2 font-medium">说明</th>
                                {@render sortHeader('created_at', '创建时间')}
                                <th scope="col" class="px-4 py-2 font-medium">状态</th>
                                {@render sortHeader('type', '类型')}
                                <th scope="col" class="px-4 py-2 text-center font-medium">服务</th>
                                <th scope="col" class="px-4 py-2 text-center font-medium">发票</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                            {#each ordersQuery.data.items as order (order.id)}
                                {@const status = statusMeta[order.status] ?? { label: order.status, class: 'bg-muted text-muted-foreground' }}
                                <tr>
                                    <td class="whitespace-nowrap px-4 py-3 font-mono text-xs">{order.id}</td>
                                    <td class="whitespace-nowrap px-4 py-3 font-medium">{formatMoney(order.total)}</td>
                                    <td class="max-w-xs px-4 py-3">
                                        <p class="truncate" title={order.description}>{order.description}</p>
                                    </td>
                                    <td class="whitespace-nowrap px-4 py-3 text-muted-foreground" title={formatDateTime(order.createdAt)}>
                                        {formatDistanceToNowStrict(order.createdAt, { addSuffix: true, locale: zhCN })}
                                    </td>
                                    <td class="px-4 py-3">
                                        <span class={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', status.class)}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td class="whitespace-nowrap px-4 py-3">{typeLabel[order.type] ?? order.type}</td>
                                    <td class="px-4 py-3 text-center">
                                        {#if order.serverId}
                                            <CheckCircle2 class="mx-auto size-4 text-success" aria-label="已关联服务器" />
                                        {:else}
                                            <XCircle class="mx-auto size-4 text-muted-foreground" aria-label="未关联服务器" />
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3 text-center">
                                        <InvoiceButton {order} onError={m => (actionError = m)} />
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>

                {#if pagination && pagination.totalPages > 1}
                    <div class="flex items-center justify-between border-t border-border p-4 text-sm">
                        <p class="text-muted-foreground">
                            第 {pagination.currentPage} / {pagination.totalPages} 页，共 {pagination.total} 条
                        </p>
                        <div class="flex gap-2">
                            <Button variant="outline" size="sm" disabled={page <= 1} onclick={() => page--}>
                                <ChevronLeft />上一页
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= pagination.totalPages}
                                onclick={() => page++}
                            >
                                下一页<ChevronRight />
                            </Button>
                        </div>
                    </div>
                {/if}
            {/if}
        </CardContent>
    </Card>
</div>
