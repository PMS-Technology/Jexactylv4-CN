<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { adminBillingKeys, getOrders, type OrderQuery } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { cn } from '$lib/utils/cn';
    import { Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import { orderType, pill, statusOf, when } from './labels';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';

    /**
     * All orders, ported from orders/OrdersContainer.tsx and OrdersTable.tsx. The legacy
     * table offered sorting by order type, which OrderController does not allow (400).
     */
    /** Set when embedded on a server page: only that server's orders, no notice. */
    let { serverId = null }: { serverId?: number | null } = $props();

    const table = new TableState<'id' | 'total' | 'created_at' | 'threat_index'>();

    const params = $derived<OrderQuery>({
        page: table.page,
        filters: { description: table.query || undefined, server_id: serverId ?? undefined },
        sorts: table.sorts,
    });

    const orders = createQuery(() => ({
        queryKey: [...adminBillingKeys.orders, params],
        queryFn: () => getOrders(params),
        placeholderData: keepPreviousData,
    }));

    const threatClass = (index: number) =>
        index < 0 ? 'bg-muted text-muted-foreground' : index >= 50 ? 'bg-destructive/15 text-destructive' : index >= 25 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success';
</script>

{#if serverId === null}
<Alert variant="warning" title="说明" class="mb-4">
    待支付订单 7 天后会自动标记为过期并删除，之后不再显示在这里。如需手动删除订单，只能直接操作数据库，不建议这样做。
</Alert>
{/if}

<Card class="p-0">
    <div class="border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按描述搜索" />
    </div>

    {#if orders.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(orders.error)}</Alert></div>
    {:else if !orders.data}
        <Spinner centered />
    {:else if !orders.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的订单。' : '还没有订单。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="total" label="金额" />
                        <th scope="col" class="px-4 py-2 font-medium">描述</th>
                        <SortHeader {table} key="created_at" label="创建时间" />
                        <th scope="col" class="px-4 py-2 font-medium">支付状态</th>
                        <th scope="col" class="px-4 py-2 font-medium">类型</th>
                        <SortHeader {table} key="threat_index" label="风险指数" />
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each orders.data.items as order (order.id)}
                        {@const status = statusOf(order.status)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{order.id}</td>
                            <td class="px-4 py-3 font-semibold whitespace-nowrap">{formatMoney(order.total)}</td>
                            <td class="min-w-48 px-4 py-3">
                                <span class="font-mono text-xs text-muted-foreground">{order.name.slice(0, 8)}</span>
                                {order.description}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">{when(order.createdAt)}</td>
                            <td class="px-4 py-3"><span class={cn(pill, status.class)}>{status.label}</span></td>
                            <td class="px-4 py-3">
                                <span class={cn(pill, order.type === 'new' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary')}>
                                    {orderType[order.type] ?? order.type}
                                </span>
                            </td>
                            <td class="px-4 py-3">
                                <span class={cn(pill, threatClass(order.threatIndex))}>
                                    {order.threatIndex < 0 ? '检测中' : `${order.threatIndex}/100`}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={orders.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
