<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { BadgeCheck, Ban } from '@lucide/svelte';
    import { getOrder, updateOrder } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import { orderType, statusOf, when } from './labels';

    /**
     * The detail of one order, and the two things an administrator can do to it.
     *
     * The gateways tell the panel when a payment settles, so an order usually needs
     * nothing from anyone. These actions are for the orders the gateway never told the
     * panel about: `mark_paid` settles the order and carries out what it paid for,
     * `cancel` gives it up.
     */
    type Props = { open?: boolean; orderId: number | null; onChanged: () => Promise<unknown> };
    let { open = $bindable(false), orderId, onChanged }: Props = $props();

    const order = createQuery(() => ({
        queryKey: ['admin', 'billing', 'orders', orderId],
        queryFn: () => getOrder(orderId!),
        enabled: open && orderId !== null,
    }));

    let busy = $state(false);
    let error = $state('');
    let confirmOpen = $state(false);
    let confirmAction = $state<'mark_paid' | 'cancel'>('mark_paid');

    const current = $derived(order.data ?? null);
    const pending = $derived(current?.status === 'pending');

    const CONFIRM_COPY: Record<'mark_paid' | 'cancel', { title: string; label: string; body: string }> = {
        mark_paid: {
            title: '标记为已支付',
            label: '确认已收款',
            body: '这会把订单标记为已支付，并真的执行它买的东西：新建服务器、续期或升级。确认你已经收到这笔钱了吗？',
        },
        cancel: {
            title: '取消订单',
            label: '取消订单',
            body: '订单会被标记为已过期，之后由清理任务删除。订单买的东西不会被执行。',
        },
    };

    async function act(action: 'mark_paid' | 'cancel') {
        busy = true;
        error = '';
        try {
            await updateOrder(current!.id, action);
            await onChanged();
            await order.refetch();
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            busy = false;
        }
    }

    const ask = (action: 'mark_paid' | 'cancel') => {
        confirmAction = action;
        confirmOpen = true;
    };

    /** The labels the order's metadata carries, in a readable order. */
    const metadataRows = $derived(
        current
            ? Object.entries(current.metadata)
                  .filter(([, value]) => value !== '' && value !== null && value !== undefined)
                  .map(([key, value]) => ({ key, value: String(value) }))
            : [],
    );
</script>

<Dialog bind:open title="订单详情" class="sm:max-w-xl">
    {#if order.isLoading}
        <p class="text-sm text-muted-foreground">正在读取订单…</p>
    {:else if order.error}
        <Alert variant="destructive">{httpErrorToHuman(order.error)}</Alert>
    {:else if current}
        <div class="space-y-4 text-sm">
            {#if error}<Alert variant="destructive">{error}</Alert>{/if}

            <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="font-medium">{current.description}</p>
                    <p class="text-xs text-muted-foreground">订单 #{current.id} · {orderType[current.type] ?? current.type}</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-semibold">{formatMoney(current.total)}</p>
                    <span class="text-xs text-muted-foreground">{statusOf(current.status).label}</span>
                </div>
            </div>

            <dl class="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-muted/50 p-3 text-xs">
                <div>
                    <dt class="text-muted-foreground">客户</dt>
                    <dd class="font-medium">{current.user.username ?? `#${current.userId}`}</dd>
                    {#if current.user.email}<dd class="text-muted-foreground">{current.user.email}</dd>{/if}
                </div>
                <div>
                    <dt class="text-muted-foreground">创建时间</dt>
                    <dd class="font-medium">{when(current.createdAt)}</dd>
                </div>
                <div class="col-span-2">
                    <dt class="text-muted-foreground">网关流水号</dt>
                    <dd class="break-all font-mono">{current.transactionId ?? '—'}</dd>
                </div>
                {#if current.serverId}
                    <div>
                        <dt class="text-muted-foreground">服务器</dt>
                        <dd class="font-medium">#{current.serverId}</dd>
                    </div>
                {/if}
                <div>
                    <dt class="text-muted-foreground">商品</dt>
                    <dd class="font-medium">#{current.productId}</dd>
                </div>
            </dl>

            {#if metadataRows.length}
                <details class="rounded-md border border-border">
                    <summary class="cursor-pointer px-3 py-2 text-xs font-medium">订单信息</summary>
                    <dl class="space-y-1 border-t border-border px-3 py-2 text-xs">
                        {#each metadataRows as row (row.key)}
                            <div class="flex justify-between gap-4">
                                <dt class="text-muted-foreground">{row.key}</dt>
                                <dd class="break-all text-right font-mono">{row.value}</dd>
                            </div>
                        {/each}
                    </dl>
                </details>
            {/if}

            {#if pending}
                <p class="text-xs text-muted-foreground">只有待支付的订单可以手动处理。已完成的订单不受影响。</p>
            {/if}
        </div>
    {/if}

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={busy} onclick={() => (open = false)}>关闭</Button>
        {#if pending}
            <Button variant="destructive" size="sm" loading={busy} onclick={() => ask('cancel')}>
                <Ban />取消订单
            </Button>
            <Button size="sm" loading={busy} onclick={() => ask('mark_paid')}>
                <BadgeCheck />标记为已支付
            </Button>
        {/if}
    {/snippet}
</Dialog>

<!-- The confirmation sits after the dialog so that it is layered on top of it. -->
<ConfirmDialog
    bind:open={confirmOpen}
    title={CONFIRM_COPY[confirmAction].title}
    confirmLabel={CONFIRM_COPY[confirmAction].label}
    onConfirm={() => act(confirmAction)}
>
    {CONFIRM_COPY[confirmAction].body}
</ConfirmDialog>
