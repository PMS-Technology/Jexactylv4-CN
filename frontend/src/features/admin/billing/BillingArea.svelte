<script lang="ts">
    import { Banknote, CalendarDays, CircleDollarSign, Cog, FileText, LayoutGrid, Monitor, ShoppingCart, XCircle } from '@lucide/svelte';
    import { updateBillingSetting } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import { Button, Card } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import OverviewTab from './overview/OverviewTab.svelte';
    import CategoriesList from './products/CategoriesList.svelte';
    import CategoryPage from './products/CategoryPage.svelte';
    import ProductPage from './products/ProductPage.svelte';
    import OrdersTab from './OrdersTab.svelte';
    import InvoicesTab from './InvoicesTab.svelte';
    import ExceptionsTab from './ExceptionsTab.svelte';
    import RenewalTab from './RenewalTab.svelte';
    import DiscountCodesTab from './discounts/DiscountCodesTab.svelte';
    import SettingsTab from './settings/SettingsTab.svelte';

    /**
     * Billing module, ported from BillingRouter.tsx and EnableBilling.tsx. Every sub-page
     * is matched here. The legacy sub-navigation showed every tab to every role; tabs are
     * hidden here when the role lacks the permission their endpoint checks.
     */
    const sub = $derived(router.pathname.replace(/^\/admin\/billing\/?/, '').replace(/\/+$/, ''));
    const parts = $derived(sub.split('/'));
    const enabled = $derived(Boolean(app.flags?.billing.enabled));

    const tabs = $derived(
        [
            { path: '', name: '概览', icon: Monitor, permission: 'billing.read' },
            { path: 'categories', name: '商品', icon: LayoutGrid, permission: 'billing.read' },
            { path: 'orders', name: '订单', icon: ShoppingCart, permission: 'billing.orders' },
            { path: 'invoices', name: '发票', icon: FileText, permission: 'billing.invoices' },
            { path: 'exceptions', name: '异常', icon: XCircle, permission: 'billing.exceptions' },
            { path: 'renewal-dates', name: '续期', icon: CalendarDays, permission: 'billing.read' },
            { path: 'discount-codes', name: '优惠码', icon: CircleDollarSign, permission: 'billing.discount-codes' },
            { path: 'settings', name: '设置', icon: Cog, permission: 'billing.read' },
        ].filter(tab => app.can(tab.permission)),
    );

    const id = (value: string | undefined) => (value && /^\d+$/.test(value) ? Number(value) : null);

    let toggling = $state(false);
    let error = $state('');

    async function enable() {
        toggling = true;
        error = '';
        try {
            await updateBillingSetting('enabled', true);
            app.updateFlags({ billing: { ...app.flags!.billing, enabled: true } });
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            toggling = false;
        }
    }
</script>

<svelte:head>
    <title>计费 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if !enabled}
        <PageHeader title="计费系统" />
        {#if error}<Alert variant="destructive" class="mb-4">{error}</Alert>{/if}
        <Card class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <Banknote class="size-8 shrink-0 text-primary" />
            <p class="flex-1 text-sm text-muted-foreground">
                计费系统让用户在面板上购买和续费服务器。你可以创建商品分类和套餐、查看订单与 PDF 发票、管理优惠码，并通过 Stripe 收款。此功能可以随时开关。
            </p>
            {#if app.can('billing.update')}
                <Button loading={toggling} onclick={enable}>启用计费模块</Button>
            {/if}
        </Card>
    {:else}
        <PageHeader title="计费" description="配置面板的计费设置。" />

        <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="计费分类">
            {#each tabs as tab (tab.path)}
                {@const Icon = tab.icon}
                <Link
                    href={tab.path ? `/admin/billing/${tab.path}` : '/admin/billing'}
                    end={tab.path === ''}
                    class="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    activeClass="border-primary! text-foreground font-medium"
                >
                    <Icon class="size-4" />{tab.name}
                </Link>
            {/each}
        </nav>

        {#if sub === ''}
            <OverviewTab />
        {:else if parts[0] === 'categories'}
            {#if parts.length === 1}
                <CategoriesList />
            {:else if parts.length === 2 && parts[1] === 'new'}
                <CategoryPage id={null} />
            {:else if parts.length === 2 && id(parts[1]) !== null}
                {#key parts[1]}
                    <CategoryPage id={id(parts[1])} />
                {/key}
            {:else if parts.length === 4 && id(parts[1]) !== null && parts[2] === 'products' && (parts[3] === 'new' || id(parts[3]) !== null)}
                {#key sub}
                    <ProductPage categoryId={id(parts[1])!} productId={id(parts[3])} />
                {/key}
            {:else}
                <NotFound backTo="/admin/billing/categories" />
            {/if}
        {:else if sub === 'orders'}
            <OrdersTab />
        {:else if sub === 'invoices'}
            <InvoicesTab />
        {:else if sub === 'exceptions'}
            <ExceptionsTab />
        {:else if sub === 'renewal-dates'}
            <RenewalTab />
        {:else if sub === 'discount-codes'}
            <DiscountCodesTab />
        {:else if sub === 'settings'}
            <SettingsTab />
        {:else}
            <NotFound backTo="/admin/billing" />
        {/if}
    {/if}
</div>
