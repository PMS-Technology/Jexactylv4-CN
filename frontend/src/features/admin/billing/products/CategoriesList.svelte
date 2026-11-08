<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { Plus, ShoppingCart } from '@lucide/svelte';
    import { adminBillingKeys, getCategories, type CategoryQuery } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { pill, when } from '../labels';
    import SearchBox from '../../shared/SearchBox.svelte';
    import SortHeader from '../../shared/SortHeader.svelte';
    import { TableState } from '../../shared/table.svelte';

    /** Product categories, ported from products/CategoryTable.tsx. */
    const table = new TableState<'id' | 'name' | 'created_at' | 'visible'>();

    const params = $derived<CategoryQuery>({
        page: table.page,
        filters: { name: table.query || undefined },
        sorts: table.sorts,
    });

    const categories = createQuery(() => ({
        queryKey: [...adminBillingKeys.categories, 'list', params],
        queryFn: () => getCategories(params),
        placeholderData: keepPreviousData,
    }));
</script>

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按名称搜索分类" />
        {#if app.can('billing.category-create')}
            <Button href="/admin/billing/categories/new"><Plus />新建分类</Button>
        {/if}
    </div>

    {#if categories.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(categories.error)}</Alert></div>
    {:else if !categories.data}
        <Spinner centered />
    {:else if !categories.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的分类。' : '还没有分类。分类用来存放商品，先创建一个吧。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <th scope="col" class="w-10 px-4 py-2"><span class="sr-only">图标</span></th>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="name" label="名称" />
                        <th scope="col" class="px-4 py-2 font-medium">描述</th>
                        <SortHeader {table} key="created_at" label="创建时间" />
                        <SortHeader {table} key="visible" label="可见性" />
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each categories.data.items as category (category.id)}
                        <tr>
                            <td class="px-4 py-3">
                                {#if category.icon}
                                    <img src={category.icon} alt="" class="size-6 rounded-full object-cover" />
                                {:else}
                                    <ShoppingCart class="size-5 text-muted-foreground" />
                                {/if}
                            </td>
                            <td class="px-4 py-3 font-mono text-xs">{category.id}</td>
                            <td class="px-4 py-3">
                                <Link href="/admin/billing/categories/{category.id}" class="font-medium text-primary hover:underline">{category.name}</Link>
                            </td>
                            <td class="px-4 py-3 text-muted-foreground">{category.description ?? ''}</td>
                            <td class="px-4 py-3 whitespace-nowrap">{when(category.createdAt)}</td>
                            <td class="px-4 py-3">
                                <span class={cn(pill, category.visible ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                                    {category.visible ? '可见' : '隐藏'}
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={categories.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
