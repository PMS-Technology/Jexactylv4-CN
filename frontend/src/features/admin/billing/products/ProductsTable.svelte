<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { Plus, ShoppingBag } from '@lucide/svelte';
    import { adminBillingKeys, getProducts, type ProductQuery } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import { when } from '../labels';
    import SearchBox from '../../shared/SearchBox.svelte';
    import SortHeader from '../../shared/SortHeader.svelte';
    import { TableState } from '../../shared/table.svelte';

    /**
     * Products in one category, ported from products/ProductTable.tsx. The legacy table
     * printed prices with a hard-coded `$`; the store currency is used here.
     */
    let { categoryId }: { categoryId: number } = $props();

    const table = new TableState<'id' | 'name' | 'price'>();

    const params = $derived<ProductQuery>({
        page: table.page,
        filters: { name: table.query || undefined },
        sorts: table.sorts,
    });

    const products = createQuery(() => ({
        queryKey: [...adminBillingKeys.products(categoryId), params],
        queryFn: () => getProducts(categoryId, params),
        placeholderData: keepPreviousData,
    }));
</script>

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按名称搜索商品" />
        {#if app.can('billing.product-create')}
            <Button href="/admin/billing/categories/{categoryId}/products/new"><Plus />新建商品</Button>
        {/if}
    </div>

    {#if products.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(products.error)}</Alert></div>
    {:else if !products.data}
        <Spinner centered />
    {:else if !products.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的商品。' : '这个分类还没有商品。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <th scope="col" class="w-10 px-4 py-2"><span class="sr-only">图标</span></th>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="name" label="名称" />
                        <SortHeader {table} key="price" label="月费" />
                        <th scope="col" class="px-4 py-2 font-medium">描述</th>
                        <th scope="col" class="px-4 py-2 font-medium">创建时间</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each products.data.items as product (product.id)}
                        <tr>
                            <td class="px-4 py-3">
                                {#if product.icon}
                                    <img src={product.icon} alt="" class="size-6 rounded-full object-cover" />
                                {:else}
                                    <ShoppingBag class="size-5 text-muted-foreground" />
                                {/if}
                            </td>
                            <td class="px-4 py-3 font-mono text-xs">{product.id}</td>
                            <td class="px-4 py-3">
                                <Link href="/admin/billing/categories/{categoryId}/products/{product.id}" class="font-medium text-primary hover:underline">{product.name}</Link>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">{product.price === 0 ? '免费' : `${formatMoney(product.price)} / 月`}</td>
                            <td class="px-4 py-3 text-muted-foreground">{product.description ?? ''}</td>
                            <td class="px-4 py-3 whitespace-nowrap">{when(product.createdAt)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={products.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
