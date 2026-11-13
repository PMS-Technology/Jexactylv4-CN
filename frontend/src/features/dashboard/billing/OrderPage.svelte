<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Box, ExternalLink, Server as ServerIcon, ShoppingBag, Tag } from '@lucide/svelte';
    import {
        billingKeys,
        createCheckoutSession,
        getEggVariables,
        getPaymentMethods,
        getProduct,
        getProductEggs,
        getViableNodes,
        processFreeOrder,
    } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { DiscountCode } from '$lib/api/definitions/billing';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { RadioGroup } from 'bits-ui';
    import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import ChoiceCard from './components/ChoiceCard.svelte';
    import DiscountCodeDialog from './components/DiscountCodeDialog.svelte';
    import PaymentMethodPicker from './components/PaymentMethodPicker.svelte';
    import ProductLimits from './components/ProductLimits.svelte';
    import StoreUnavailable from './components/StoreUnavailable.svelte';
    import VariableField from './components/VariableField.svelte';
    import { applyDiscount, formatMoney } from './money';

    let { params }: { params: { id: string } } = $props();

    const id = $derived(/^\d+$/.test(params.id) ? Number(params.id) : null);
    const links = $derived(app.flags?.billing.links);

    const queryClient = useQueryClient();

    const productQuery = createQuery(() => ({
        queryKey: billingKeys.product(id ?? 0),
        queryFn: () => getProduct(id!),
        enabled: id !== null,
    }));
    const product = $derived(productQuery.data);
    // Mirrors Product::isPaid(); the free endpoint rejects anything priced above zero.
    const isFree = $derived(Boolean(product && product.price <= 0));
    const needsEgg = $derived(product?.eggId === null);

    // The ways the customer can pay. A method whose channel is not configured is left
    // out by the backend, so an empty list means the store cannot take money.
    const methodsQuery = createQuery(() => ({
        queryKey: billingKeys.paymentMethods,
        queryFn: getPaymentMethods,
    }));
    const methods = $derived(methodsQuery.data ?? []);

    const nodesQuery = createQuery(() => ({
        queryKey: billingKeys.nodes(id ?? 0),
        queryFn: () => getViableNodes(id!),
        enabled: Boolean(product),
        // The backend pings every node's daemon; don't repeat that on each focus.
        refetchOnWindowFocus: false,
    }));

    const eggsQuery = createQuery(() => ({
        queryKey: billingKeys.eggs(id ?? 0),
        queryFn: () => getProductEggs(id!),
        enabled: needsEgg,
    }));

    let nodeChoice = $state<number | null>(null);
    let eggChoice = $state<number | null>(null);

    /** Free products can only go to nodes that allow free servers and charge no fee. */
    const nodeAllowed = (node: { deployableFree: boolean; deploymentFee: number }) =>
        !isFree || (node.deployableFree && node.deploymentFee <= 0);

    // Preselect the first eligible node, as the legacy page did, until the user picks one.
    const nodeId = $derived(nodeChoice ?? nodesQuery.data?.find(nodeAllowed)?.id ?? null);
    const node = $derived(nodesQuery.data?.find(n => n.id === nodeId));
    const eggId = $derived(product?.eggId ?? eggChoice);

    const variablesQuery = createQuery(() => ({
        queryKey: billingKeys.variables(eggId ?? 0),
        queryFn: () => getEggVariables(eggId!),
        enabled: eggId !== null,
    }));
    const editable = $derived(variablesQuery.data?.filter(v => v.isEditable) ?? []);

    /** Only values the user touched are sent; the backend fills the rest from egg defaults. */
    let overrides = $state<Record<string, string>>({});
    // A different egg has different variables, so earlier overrides no longer apply.
    $effect(() => {
        void eggId;
        overrides = {};
    });

    let termsAgreed = $state(false);
    let privacyAgreed = $state(false);

    let discount = $state<DiscountCode | null>(null);
    let discountOpen = $state(false);

    let methodChoice = $state<string | null>(null);
    // The first method is preselected, the way the node list picks its first entry.
    const method = $derived(methods.find(m => m.identifier === methodChoice) ?? methods[0] ?? null);

    /** The number of each step, so the headings read 1, 2, 3 as the steps are shown. */
    const step = $derived.by((): Record<string, number> => {
        const steps: Record<string, number> = { node: 1 };
        let next = 2;

        if (needsEgg) steps.egg = next++;
        if (editable.length) steps.variables = next++;
        if (!isFree) steps.payment = next;

        return steps;
    });

    const subtotal = $derived(product ? applyDiscount(product.price, discount) : 0);
    const fee = $derived(isFree ? 0 : (node?.deploymentFee ?? 0));
    const dueToday = $derived(subtotal + fee);

    const blocker = $derived.by(() => {
        if (!nodeId) return '请选择部署位置。';
        if (needsEgg && !eggChoice) return '请选择服务器类型。';
        if (!isFree && !method) return '请选择支付方式。';
        if (!termsAgreed || !privacyAgreed) return '请先阅读并同意服务条款和隐私政策。';

        return null;
    });

    let submitting = $state(false);
    let error = $state('');

    async function submit() {
        if (blocker || submitting || !product || !nodeId) return;

        submitting = true;
        error = '';

        const request = {
            productId: product.id,
            nodeId,
            eggId: eggId ?? undefined,
            variables: Object.entries(overrides).map(([key, value]) => ({ key, value })),
        };

        try {
            if (isFree) {
                await processFreeOrder(request);
                await queryClient.invalidateQueries({ queryKey: ['servers'] });
                navigate('/');
            } else {
                const url = await createCheckoutSession({
                    ...request,
                    paymentMethod: method!.identifier,
                    discountCode: discount?.code,
                });
                // Leaving for the gateway's hosted checkout; keep the button busy until
                // the page unloads.
                window.location.assign(url);
                return;
            }
        } catch (e) {
            error = httpErrorToHuman(e);
        }
        submitting = false;
    }
</script>

<svelte:head>
    <title>{product ? `订购 ${product.name}` : '订购服务'} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

{#if id === null}
    <NotFound backTo="/account/billing/order" />
{:else if productQuery.error}
    <div class="mx-auto max-w-3xl p-6 lg:p-8">
        <Alert variant="destructive">{httpErrorToHuman(productQuery.error)}</Alert>
    </div>
{:else if !product || methodsQuery.isPending}
    <Spinner centered />
{:else if !isFree && !methods.length}
    <StoreUnavailable />
{:else}
    <div class="mx-auto max-w-6xl p-6 lg:p-8">
        <Button href="/account/billing/order" variant="ghost" size="sm" class="-ml-3 mb-4">
            <ArrowLeft />
            返回套餐列表
        </Button>

        <header class="mb-6 space-y-1">
            <h1 class="font-header text-xl font-semibold tracking-tight">你的订单</h1>
            <p class="text-sm text-muted-foreground">配置所选套餐，然后提交订单。</p>
        </header>

        <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div class="space-y-4">
                <Card>
                    <CardHeader><CardTitle>{step.node}. 选择部署位置</CardTitle></CardHeader>
                    <CardContent>
                        {#if nodesQuery.error}
                            <Alert variant="destructive">{httpErrorToHuman(nodesQuery.error)}</Alert>
                        {:else if nodesQuery.isPending}
                            <Spinner centered />
                        {:else if !nodesQuery.data.length}
                            <Alert variant="destructive">目前没有可部署的节点，请联系管理员。</Alert>
                        {:else}
                            <RadioGroup.Root
                                value={nodeChoice === null ? '' : String(nodeChoice)}
                                onValueChange={value => (nodeChoice = Number(value))}
                                aria-label="部署位置"
                                class="grid gap-3 sm:grid-cols-2"
                            >
                                {#each nodesQuery.data as n (n.id)}
                                    {@const allowed = nodeAllowed(n)}
                                    <ChoiceCard value={String(n.id)} disabled={!allowed}>
                                        <p class="flex items-center gap-2 font-medium">
                                            <ServerIcon class="size-4 shrink-0 text-muted-foreground" />
                                            <span class="truncate">{n.name}</span>
                                        </p>
                                        <p class="mt-0.5 truncate font-mono text-xs text-muted-foreground">{n.fqdn}</p>
                                        {#if !allowed}
                                            <p class="mt-1 text-xs text-muted-foreground">仅适用于付费套餐</p>
                                        {:else if !isFree && n.deploymentFee > 0}
                                            <p class="mt-1 text-xs text-warning">
                                                另收一次性部署费 {formatMoney(n.deploymentFee)}
                                            </p>
                                        {/if}
                                    </ChoiceCard>
                                {/each}
                            </RadioGroup.Root>
                        {/if}
                    </CardContent>
                </Card>

                {#if needsEgg}
                    <Card>
                        <CardHeader><CardTitle>{step.egg}. 选择服务器类型</CardTitle></CardHeader>
                        <CardContent>
                            {#if eggsQuery.error}
                                <Alert variant="destructive">{httpErrorToHuman(eggsQuery.error)}</Alert>
                            {:else if eggsQuery.isPending}
                                <Spinner centered />
                            {:else if !eggsQuery.data.length}
                                <Alert variant="destructive">这个套餐没有可用的服务器类型，请联系管理员。</Alert>
                            {:else}
                                <RadioGroup.Root
                                    value={eggChoice === null ? '' : String(eggChoice)}
                                    onValueChange={value => (eggChoice = Number(value))}
                                    aria-label="服务器类型"
                                    class="grid gap-3 sm:grid-cols-2"
                                >
                                    {#each eggsQuery.data as egg (egg.id)}
                                        <ChoiceCard value={String(egg.id)}>
                                            <p class="flex items-center gap-2 font-medium">
                                                <Box class="size-4 shrink-0 text-muted-foreground" />
                                                <span class="truncate">{egg.name}</span>
                                            </p>
                                        </ChoiceCard>
                                    {/each}
                                </RadioGroup.Root>
                            {/if}
                        </CardContent>
                    </Card>
                {/if}

                {#if editable.length}
                    <Card>
                        <CardHeader>
                            <CardTitle>{step.variables}. 服务器变量</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p class="mb-4 text-sm text-muted-foreground">
                                可以在服务器创建前修改这些变量；未修改的项使用默认值。
                            </p>
                            <div class="grid gap-3 sm:grid-cols-2">
                                {#key eggId}
                                    {#each editable as variable (variable.envVariable)}
                                        <VariableField
                                            {variable}
                                            onChange={value => (overrides[variable.envVariable] = value)}
                                        />
                                    {/each}
                                {/key}
                            </div>
                        </CardContent>
                    </Card>
                {/if}

                {#if !isFree}
                    <Card>
                        <CardHeader><CardTitle>{step.payment}. 选择支付方式</CardTitle></CardHeader>
                        <CardContent>
                            {#if methodsQuery.error}
                                <Alert variant="destructive">{httpErrorToHuman(methodsQuery.error)}</Alert>
                            {:else if !methods.length}
                                <Alert variant="destructive">目前没有可用的支付方式，请联系管理员。</Alert>
                            {:else}
                                <PaymentMethodPicker
                                    {methods}
                                    value={method?.identifier ?? null}
                                    onChange={identifier => (methodChoice = identifier)}
                                />
                            {/if}
                        </CardContent>
                    </Card>
                {/if}

                <Card>
                    <CardHeader><CardTitle>法律文件</CardTitle></CardHeader>
                    <CardContent class="space-y-3 text-sm">
                        <Checkbox bind:checked={termsAgreed} wrapperClass="items-start gap-3">
                            {#snippet children({ id })}
                                <span id={id}>
                                    我已阅读并同意
                                    <a
                                        href={links?.terms}
                                        target="_blank"
                                        rel="noreferrer"
                                        class="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                                    >
                                        服务条款<ExternalLink class="size-3" />
                                    </a>
                                </span>
                            {/snippet}
                        </Checkbox>
                        <Checkbox bind:checked={privacyAgreed} wrapperClass="items-start gap-3">
                            {#snippet children({ id })}
                                <span id={id}>
                                    我已阅读并同意
                                    <a
                                        href={links?.privacy}
                                        target="_blank"
                                        rel="noreferrer"
                                        class="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                                    >
                                        隐私政策<ExternalLink class="size-3" />
                                    </a>
                                </span>
                            {/snippet}
                        </Checkbox>
                    </CardContent>
                </Card>
            </div>

            <aside class="lg:sticky lg:top-6 lg:self-start">
                <Card>
                    <CardHeader>
                        <div class="flex items-center gap-3">
                            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                {#if product.icon}
                                    <img src={product.icon} alt="" class="size-6" />
                                {:else}
                                    <ShoppingBag class="size-5 text-muted-foreground" />
                                {/if}
                            </div>
                            <CardTitle class="min-w-0 truncate">{product.name}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent class="space-y-4">
                        <ProductLimits limits={product.limits} />

                        <dl class="space-y-1.5 border-t border-border pt-4 text-sm">
                            {#if isFree}
                                <div class="flex justify-between font-medium">
                                    <dt>价格</dt>
                                    <dd>免费</dd>
                                </div>
                            {:else}
                                <div class="flex justify-between">
                                    <dt class="text-muted-foreground">月费</dt>
                                    <dd>
                                        {#if discount}
                                            <span class="mr-1 text-muted-foreground line-through">
                                                {formatMoney(product.price)}
                                            </span>
                                        {/if}
                                        {formatMoney(subtotal)}
                                    </dd>
                                </div>
                                {#if fee > 0}
                                    <div class="flex justify-between">
                                        <dt class="text-muted-foreground">一次性部署费</dt>
                                        <dd>{formatMoney(fee)}</dd>
                                    </div>
                                {/if}
                                <div class="flex justify-between border-t border-border pt-1.5 font-medium">
                                    <dt>今日应付</dt>
                                    <dd>{formatMoney(dueToday)}</dd>
                                </div>
                                {#if fee > 0}
                                    <p class="text-xs text-muted-foreground">
                                        之后每个账期 {formatMoney(subtotal)} / 月。
                                    </p>
                                {/if}
                            {/if}
                        </dl>

                        {#if !isFree}
                            <button
                                type="button"
                                class="flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                                onclick={() => (discountOpen = true)}
                            >
                                <Tag class="size-3.5" />
                                {discount ? `已使用优惠码 ${discount.code}` : '使用优惠码'}
                            </button>
                        {/if}

                        {#if error}
                            <Alert variant="destructive">{error}</Alert>
                        {/if}

                        {#if blocker}
                            <p class="text-xs text-muted-foreground">{blocker}</p>
                        {/if}
                        <Button class="w-full" loading={submitting} disabled={Boolean(blocker)} onclick={submit}>
                            {isFree ? '创建服务器' : '前往支付'}
                        </Button>
                        {#if !isFree}
                            <p class="text-xs text-muted-foreground">
                                将跳转到{method?.name ?? '支付渠道'}完成支付。
                            </p>
                        {/if}
                    </CardContent>
                </Card>
            </aside>
        </div>

        <DiscountCodeDialog bind:open={discountOpen} code={discount} onApply={c => (discount = c)} />
    </div>
{/if}
