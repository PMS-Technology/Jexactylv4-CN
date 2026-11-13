<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { CreditCard, Pencil, Plus, Trash2 } from '@lucide/svelte';
    import {
        adminBillingKeys,
        deletePaymentMethod,
        getPaymentMethods,
        type AdminPaymentMethod,
        type PaymentMethodQuery,
    } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { pill, when } from '../labels';
    import SearchBox from '../../shared/SearchBox.svelte';
    import SortHeader from '../../shared/SortHeader.svelte';
    import { TableState } from '../../shared/table.svelte';
    import MethodDialog from './MethodDialog.svelte';

    /**
     * The payment methods a customer can choose from at checkout.
     *
     * A method points at a payment channel: `stripe` is Stripe itself, `epay:wxpay` is
     * the WeChat Pay method of the Epay channel. A method whose channel has not been
     * configured is left out of the storefront, so it shows up here but never at
     * checkout.
     */
    const table = new TableState<'id' | 'identifier' | 'name' | 'sort' | 'created_at'>();
    const queryClient = useQueryClient();

    const params = $derived<PaymentMethodQuery>({
        page: table.page,
        filters: { identifier: table.query || undefined },
        sorts: table.sorts,
    });

    const methods = createQuery(() => ({
        queryKey: [...adminBillingKeys.paymentMethods, params],
        queryFn: () => getPaymentMethods(params),
        placeholderData: keepPreviousData,
    }));

    const refresh = () => queryClient.invalidateQueries({ queryKey: adminBillingKeys.paymentMethods });

    let editing = $state<AdminPaymentMethod | null>(null);
    let dialogOpen = $state(false);
    let deleting = $state<AdminPaymentMethod | null>(null);
    let deleteOpen = $state(false);

    const open = (method: AdminPaymentMethod | null) => {
        editing = method;
        dialogOpen = true;
    };

    const remove = async () => {
        await deletePaymentMethod(deleting!.id);
        await refresh();
    };
</script>

<MethodDialog bind:open={dialogOpen} method={editing} onSaved={refresh} />
<ConfirmDialog bind:open={deleteOpen} title="删除支付方式" confirmLabel="删除" onConfirm={remove}>
    确定删除支付方式 <code class="rounded bg-muted px-1 font-mono">{deleting?.identifier}</code> 吗？用户将无法再选择它。
</ConfirmDialog>

<div class="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2"><CreditCard class="size-4" />支付方式</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm text-muted-foreground">
            <p>
                支付方式是用户在结账页上看到的选项。每个支付方式都指向一个支付渠道：标识写成
                <code class="rounded bg-muted px-1 font-mono">stripe</code> 就是 Stripe 本身；
                写成 <code class="rounded bg-muted px-1 font-mono">epay:wxpay</code> 则是易支付里的微信支付，
                冒号后面的值会作为易支付的 type 参数提交。
            </p>
            <p>
                渠道的凭证在“支付渠道”标签页里填写。渠道没有配置好的支付方式不会出现在结账页。
            </p>
        </CardContent>
    </Card>

    <Card class="p-0">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <SearchBox bind:value={table.search} placeholder="按标识搜索" />
            <Button onclick={() => open(null)}><Plus />新建支付方式</Button>
        </div>

        {#if methods.error}
            <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(methods.error)}</Alert></div>
        {:else if !methods.data}
            <Spinner centered />
        {:else if !methods.data.items.length}
            <p class="py-12 text-center text-sm text-muted-foreground">
                {table.query ? '没有匹配的支付方式。' : '还没有支付方式。'}
            </p>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="border-b border-border text-left text-xs text-muted-foreground">
                        <tr>
                            <SortHeader {table} key="id" label="ID" />
                            <SortHeader {table} key="identifier" label="标识" />
                            <SortHeader {table} key="name" label="名称" />
                            <th scope="col" class="px-4 py-2 font-medium">渠道</th>
                            <SortHeader {table} key="sort" label="排序" />
                            <th scope="col" class="px-4 py-2 font-medium">状态</th>
                            <SortHeader {table} key="created_at" label="创建时间" />
                            <th scope="col" class="px-4 py-2"><span class="sr-only">操作</span></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        {#each methods.data.items as method (method.id)}
                            <tr>
                                <td class="px-4 py-3 font-mono text-xs">{method.id}</td>
                                <td class="px-4 py-3">
                                    <span class="inline-flex items-center gap-1">
                                        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{method.identifier}</code>
                                        <CopyButton text={method.identifier} label="" class="px-1" />
                                    </span>
                                </td>
                                <td class="px-4 py-3">
                                    {method.name}
                                    {#if method.description}
                                        <span class="block text-xs text-muted-foreground">{method.description}</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-3 font-mono text-xs">{method.channel}</td>
                                <td class="px-4 py-3">{method.sort}</td>
                                <td class="px-4 py-3">
                                    <span class={cn(pill, method.enabled ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                                        {method.enabled ? '已启用' : '已停用'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">{when(method.createdAt)}</td>
                                <td class="px-4 py-3">
                                    <span class="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="编辑 {method.identifier}"
                                            onclick={() => open(method)}
                                        >
                                            <Pencil />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label="删除 {method.identifier}"
                                            class="text-destructive hover:text-destructive"
                                            onclick={() => {
                                                deleting = method;
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
                <Pagination pagination={methods.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
            </div>
        {/if}
    </Card>
</div>
