<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { format } from 'date-fns';
    import { Pencil, Plus, Trash2 } from '@lucide/svelte';
    import { adminBillingKeys, deleteDiscountCode, getDiscountCodes, type AdminDiscountCode, type DiscountCodeQuery } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { pill, when } from '../labels';
    import SearchBox from '../../shared/SearchBox.svelte';
    import SortHeader from '../../shared/SortHeader.svelte';
    import { TableState } from '../../shared/table.svelte';
    import DiscountCodeDialog from './DiscountCodeDialog.svelte';

    /**
     * Discount codes, ported from discounts/DiscountCodesContainer.tsx and
     * DiscountCodesTable.tsx. The legacy table never refreshed after create, edit or
     * delete, and showed "Unlimited" for codes with 0 uses left (which are used up).
     */
    const table = new TableState<'id' | 'code' | 'value' | 'uses' | 'expires_at' | 'created_at'>();
    const queryClient = useQueryClient();

    const params = $derived<DiscountCodeQuery>({
        page: table.page,
        filters: { code: table.query || undefined },
        sorts: table.sorts,
    });

    const codes = createQuery(() => ({
        queryKey: [...adminBillingKeys.discountCodes, params],
        queryFn: () => getDiscountCodes(params),
        placeholderData: keepPreviousData,
    }));

    const refresh = () => queryClient.invalidateQueries({ queryKey: adminBillingKeys.discountCodes });
    const symbol = $derived(app.flags?.billing.currency.symbol ?? '$');

    let editing = $state<AdminDiscountCode | null>(null);
    let dialogOpen = $state(false);
    let deleting = $state<AdminDiscountCode | null>(null);
    let deleteOpen = $state(false);

    const open = (code: AdminDiscountCode | null) => {
        editing = code;
        dialogOpen = true;
    };

    const today = format(new Date(), 'yyyy-MM-dd');

    function codeStatus(code: AdminDiscountCode) {
        if (!code.active) return { label: '已停用', class: 'bg-muted text-muted-foreground' };
        // `expires_at` is cast to a date (midnight), so a code is past once that day starts.
        if (code.expiresAt && code.expiresAt <= today) return { label: '已过期', class: 'bg-muted text-muted-foreground' };
        if (code.uses === 0) return { label: '已用完', class: 'bg-warning/15 text-warning' };
        return { label: '可用', class: 'bg-success/15 text-success' };
    }

    const remove = async () => {
        await deleteDiscountCode(deleting!.id);
        await refresh();
    };
</script>

<DiscountCodeDialog bind:open={dialogOpen} code={editing} onSaved={refresh} />
<ConfirmDialog bind:open={deleteOpen} title="删除优惠码" confirmLabel="删除" onConfirm={remove}>
    确定删除优惠码 <code class="rounded bg-muted px-1 font-mono">{deleting?.code}</code> 吗？新订单将无法再使用它。
</ConfirmDialog>

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按优惠码搜索" />
        <Button onclick={() => open(null)}><Plus />新建优惠码</Button>
    </div>

    {#if codes.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(codes.error)}</Alert></div>
    {:else if !codes.data}
        <Spinner centered />
    {:else if !codes.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的优惠码。' : '还没有优惠码。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="code" label="优惠码" />
                        <SortHeader {table} key="value" label="折扣" />
                        <SortHeader {table} key="uses" label="剩余次数" />
                        <th scope="col" class="px-4 py-2 font-medium">状态</th>
                        <SortHeader {table} key="expires_at" label="到期日期" />
                        <SortHeader {table} key="created_at" label="创建时间" />
                        <th scope="col" class="px-4 py-2"><span class="sr-only">操作</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each codes.data.items as code (code.id)}
                        {@const s = codeStatus(code)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{code.id}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center gap-1">
                                    <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{code.code}</code>
                                    <CopyButton text={code.code} label="" class="px-1" />
                                </span>
                                <span class="block text-xs text-muted-foreground">{code.description}</span>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                {code.type === 'percentage' ? `${code.value}%` : `${symbol}${code.value}`} off
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">{code.uses === null || code.uses < 0 ? '不限' : code.uses}</td>
                            <td class="px-4 py-3"><span class={cn(pill, s.class)}>{s.label}</span></td>
                            <td class="px-4 py-3 whitespace-nowrap">{code.expiresAt ?? '不过期'}</td>
                            <td class="px-4 py-3 whitespace-nowrap">{when(code.createdAt)}</td>
                            <td class="px-4 py-3">
                                <span class="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" aria-label="编辑 {code.code}" onclick={() => open(code)}><Pencil /></Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="删除 {code.code}"
                                        class="text-destructive hover:text-destructive"
                                        onclick={() => {
                                            deleting = code;
                                            deleteOpen = true;
                                        }}
                                    >
                                        <Trash2 />
                                    </Button>
                                </span>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={codes.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
