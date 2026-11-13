<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { ShoppingBag } from '@lucide/svelte';
    import { billingKeys, getCategories, getPaymentMethods, getProducts } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import ProductLimits from './components/ProductLimits.svelte';
    import StoreUnavailable from './components/StoreUnavailable.svelte';
    import { formatMoney } from './money';

    // The ways the customer can pay. Without one of them the checkout cannot be
    // completed, so the store is not shown at all.
    const methodsQuery = createQuery(() => ({
        queryKey: billingKeys.paymentMethods,
        queryFn: getPaymentMethods,
    }));
    const configured = $derived(methodsQuery.isSuccess && methodsQuery.data.length > 0);

    const categoriesQuery = createQuery(() => ({
        queryKey: billingKeys.categories,
        queryFn: getCategories,
        enabled: methodsQuery.isSuccess,
    }));

    let selected = $state<number | null>(null);
    // Default to the first category once they load, without overriding a user's choice.
    const categoryId = $derived(selected ?? categoriesQuery.data?.[0]?.id ?? null);

    const productsQuery = createQuery(() => ({
        queryKey: billingKeys.products(categoryId ?? 0),
        queryFn: () => getProducts(categoryId!),
        enabled: methodsQuery.isSuccess && categoryId !== null,
    }));
</script>

<svelte:head>
    <title>订购服务 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

{#if methodsQuery.isPending}
    <Spinner centered />
{:else if !configured}
    <StoreUnavailable />
{:else}
    <div class="mx-auto max-w-7xl p-6 lg:p-8">
        <PageHeader title="订购服务" description="选择下面的任意套餐，并按需配置。" />

        {#if categoriesQuery.error}
            <Alert variant="destructive">{httpErrorToHuman(categoriesQuery.error)}</Alert>
        {:else if categoriesQuery.isPending}
            <Spinner centered />
        {:else if !categoriesQuery.data.length}
            <Alert variant="warning">暂时没有可订购的分类。</Alert>
        {:else}
            <div class="grid gap-6 lg:grid-cols-[14rem_1fr]">
                <nav class="flex gap-1 overflow-x-auto lg:flex-col" aria-label="分类">
                    {#each categoriesQuery.data as category (category.id)}
                        {@const active = category.id === categoryId}
                        <button
                            type="button"
                            class={cn(
                                'flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                                active
                                    ? 'bg-accent font-medium text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                            )}
                            aria-pressed={active}
                            onclick={() => (selected = category.id)}
                        >
                            {#if category.icon}
                                <img src={category.icon} alt="" class="size-5 rounded-full" />
                            {/if}
                            <span class="truncate">{category.name}</span>
                        </button>
                    {/each}
                </nav>

                <div>
                    {#if productsQuery.error}
                        <Alert variant="destructive">{httpErrorToHuman(productsQuery.error)}</Alert>
                    {:else if productsQuery.isPending}
                        <Spinner centered />
                    {:else if !productsQuery.data.length}
                        <Alert variant="warning">这个分类下还没有套餐。</Alert>
                    {:else}
                        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {#each productsQuery.data as product (product.id)}
                                <Card class="flex flex-col p-6">
                                    <div class="flex items-center gap-3">
                                        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                            {#if product.icon}
                                                <img src={product.icon} alt="" class="size-6" />
                                            {:else}
                                                <ShoppingBag class="size-5 text-muted-foreground" />
                                            {/if}
                                        </div>
                                        <h2 class="min-w-0 truncate font-header text-base font-semibold">
                                            {product.name}
                                        </h2>
                                    </div>

                                    <p class="mt-4 text-xl font-semibold">
                                        {product.price > 0 ? formatMoney(product.price) : '免费'}
                                        {#if product.price > 0}
                                            <span class="text-sm font-normal text-muted-foreground">/ 月</span>
                                        {/if}
                                    </p>
                                    {#if product.description}
                                        <p class="mt-1 text-sm text-muted-foreground">{product.description}</p>
                                    {/if}

                                    <div class="mt-4 border-t border-border pt-4">
                                        <ProductLimits limits={product.limits} />
                                    </div>

                                    <Button href="/account/billing/order/{product.id}" class="mt-6 w-full">
                                        配置
                                    </Button>
                                </Card>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{/if}
