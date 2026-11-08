<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { differenceInHours, format } from 'date-fns';
    import { Banknote } from '@lucide/svelte';
    import { getCategories, getProduct, getProducts } from '$lib/api/admin/billing';
    import { adminServerKeys, currentServerValues, updateServer, type AdminServer } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import OrdersTab from '../billing/OrdersTab.svelte';

    /**
     * Server billing, ported from billing/ServerBillingContainer.tsx and
     * EditServerBillingDialog.tsx. Differences:
     * - The legacy tab was disabled until the server already had a product, so billing
     *   could not be switched on here; it can now.
     * - The legacy dialog submitted the whole server object as the update body (camel
     *   case, so most keys were dropped) and reloaded the page; the stored values are sent
     *   explicitly and the page refreshes in place.
     * - Its datetime conversion shifted the renewal date by the browser's UTC offset; the
     *   local time picked is what gets stored now.
     * - The orders list filtered on the order name, which is a random UUID, so it was always
     *   empty; it filters on `server_id`.
     */
    /** `notice` lives on the page: saving refetches the server, which remounts this tab. */
    let { server, notice = $bindable(null) }: { server: AdminServer; notice?: { variant: 'success' | 'destructive'; text: string } | null } = $props();

    const queryClient = useQueryClient();
    const billing = $derived(app.flags!.billing);
    const canUpdate = $derived(app.can('servers.update') && app.can('billing.read'));

    const product = createQuery(() => ({
        queryKey: ['admin', 'billing', 'products', server.billingProductId ?? 0],
        queryFn: () => getProduct(server.billingProductId!),
        enabled: server.billingProductId !== null,
    }));
    const categories = createQuery(() => ({
        queryKey: ['admin', 'billing', 'categories', 'options'],
        queryFn: () => getCategories({}).then(r => r.items),
        enabled: canUpdate,
    }));

    let billable = $state(server.billingProductId !== null);
    let categoryId = $state<number | null>(null);
    let productId = $state<number | null>(server.billingProductId);
    let renewal = $state(format(server.renewalDate ?? new Date(Date.now() + (app.flags!.billing.renewal.days ?? 30) * 86400000), "yyyy-MM-dd'T'HH:mm"));

    // Start on the category of the current product, else the first one.
    $effect(() => {
        if (categoryId !== null || !categories.data?.length) return;
        if (server.billingProductId !== null && !product.data) return;
        categoryId = categories.data.find(c => c.uuid === product.data?.categoryUuid)?.id ?? categories.data[0]!.id;
    });

    const products = createQuery(() => ({
        queryKey: ['admin', 'billing', 'categories', categoryId, 'products', 'options'],
        queryFn: () => getProducts(categoryId!, {}).then(r => r.items),
        enabled: categoryId !== null,
    }));
    $effect(() => {
        if (products.data && !products.data.some(p => p.id === productId)) productId = products.data[0]?.id ?? null;
    });

    const until = $derived.by(() => {
        if (!server.renewalDate) return null;
        const h = differenceInHours(server.renewalDate, new Date());

        return h < 0 ? `已逾期 ${Math.floor(-h / 24)} 天 ${-h % 24} 小时` : `还有 ${Math.floor(h / 24)} 天 ${h % 24} 小时`;
    });

    let saving = $state(false);
    const valid = $derived(!billable || (productId !== null && Boolean(renewal)));

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        notice = null;
        try {
            await updateServer(server.id, {
                ...currentServerValues(server),
                billing_product_id: billable ? productId : null,
                renewal_date: billable ? new Date(renewal).toISOString() : null,
            });
            await queryClient.invalidateQueries({ queryKey: adminServerKeys.server(server.id) });
            notice = { variant: 'success', text: billable ? '计费设置已保存。' : '已关闭这台服务器的计费。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    const select =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

{#if !billing.enabled}<Alert variant="warning" class="mb-4">计费模块未启用，这里的设置要等模块启用后才会生效。</Alert>{/if}

<div class="grid gap-4 lg:grid-cols-3">
    <div class="space-y-4">
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Banknote class="size-4" />当前计费</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                <div>
                    <p class="text-xs text-muted-foreground">套餐</p>
                    {#if server.billingProductId === null}
                        <p>无</p>
                    {:else if product.data}
                        <p>{product.data.name} · {formatMoney(product.data.price)} / {billing.renewal.days ?? 30} 天</p>
                        <p class="text-xs text-muted-foreground">{product.data.limits.cpu}% CPU · {product.data.limits.memory} MiB 内存 · {product.data.limits.disk} MiB 磁盘</p>
                    {:else if product.error}
                        <p class="text-destructive">#{server.billingProductId}（套餐已删除或无法读取）</p>
                    {:else}
                        <Spinner size="sm" />
                    {/if}
                </div>
                <div>
                    <p class="text-xs text-muted-foreground">下次续期</p>
                    <p>{server.renewalDate ? format(server.renewalDate, 'yyyy-MM-dd HH:mm') : '无'}</p>
                    {#if until}<p class={cn('text-xs', until.startsWith('已逾期') ? 'text-destructive' : 'text-muted-foreground')}>{until}</p>{/if}
                </div>
            </CardContent>
        </Card>

        {#if canUpdate}
            <Card>
                <CardHeader><CardTitle>修改计费</CardTitle></CardHeader>
                <CardContent>
                    <form class="space-y-4 text-sm" onsubmit={save}>
                        {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}
                        <div class="grid grid-cols-2 overflow-hidden rounded-md border border-input" role="radiogroup" aria-label="计费状态">
                            {#each [{ v: true, l: '计费' }, { v: false, l: '不计费' }] as o (o.l)}
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={billable === o.v}
                                    disabled={saving}
                                    onclick={() => (billable = o.v)}
                                    class={cn('px-3 py-2 font-medium transition-colors', billable === o.v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                                >
                                    {o.l}
                                </button>
                            {/each}
                        </div>
                        {#if billable}
                            <div class="space-y-1.5">
                                <Label for="bill-category">分类</Label>
                                <select id="bill-category" class={select} disabled={saving || !categories.data} value={categoryId === null ? '' : String(categoryId)} onchange={e => (categoryId = Number(e.currentTarget.value))}>
                                    {#if categories.data && !categories.data.length}<option value="">还没有商品分类</option>{/if}
                                    {#each categories.data ?? [] as c (c.id)}<option value={String(c.id)}>{c.name}</option>{/each}
                                </select>
                            </div>
                            <div class="space-y-1.5">
                                <Label for="bill-product">套餐</Label>
                                <select id="bill-product" class={select} disabled={saving || !products.data?.length} value={productId === null ? '' : String(productId)} onchange={e => (productId = Number(e.currentTarget.value))}>
                                    {#if products.data && !products.data.length}<option value="">这个分类没有套餐</option>{/if}
                                    {#each products.data ?? [] as p (p.id)}<option value={String(p.id)}>{p.name} · {formatMoney(p.price)}</option>{/each}
                                </select>
                            </div>
                            <div class="space-y-1.5">
                                <Label for="bill-renewal">续期时间</Label>
                                <Input id="bill-renewal" type="datetime-local" bind:value={renewal} disabled={saving} />
                                <p class="text-xs text-muted-foreground">按你的本地时间。到期未续费会进入宽限期，之后被自动删除。</p>
                            </div>
                        {/if}
                        <div class="text-right"><Button type="submit" size="sm" loading={saving} disabled={!valid}>保存</Button></div>
                    </form>
                </CardContent>
            </Card>
        {/if}
    </div>

    <div class="lg:col-span-2">
        {#if app.can('billing.orders')}
            <OrdersTab serverId={server.id} />
        {/if}
    </div>
</div>
