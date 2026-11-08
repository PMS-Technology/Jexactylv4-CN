<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { Download } from '@lucide/svelte';
    import { adminBillingKeys, downloadInvoice, getInvoices, type InvoiceQuery } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import { orderStatus, pill, statusOf, when } from './labels';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';

    /**
     * Generated PDF invoices, ported from invoices/InvoicesTable.tsx. The legacy status
     * filter was free text matched exactly against the order status; it is a select here.
     */
    const table = new TableState<'number' | 'generated_at'>();

    let userSearch = $state('');
    let user = $state('');
    let status = $state('');

    $effect(() => {
        const value = userSearch.trim();
        const timer = setTimeout(() => {
            if (value !== user) {
                user = value;
                table.page = 1;
            }
        }, 300);

        return () => clearTimeout(timer);
    });

    const params = $derived<InvoiceQuery>({
        page: table.page,
        filters: { number: table.query || undefined, user: user || undefined, status: status || undefined },
        sorts: table.sorts,
    });

    const invoices = createQuery(() => ({
        queryKey: [...adminBillingKeys.invoices, params],
        queryFn: () => getInvoices(params),
        placeholderData: keepPreviousData,
    }));

    let downloading = $state<number | null>(null);
    let downloadError = $state('');

    async function download(id: number, number: string | null) {
        downloading = id;
        downloadError = '';
        try {
            await downloadInvoice(id, `${number ?? id}.pdf`);
        } catch (e) {
            downloadError = httpErrorToHuman(e);
        } finally {
            downloading = null;
        }
    }

    const filtered = $derived(Boolean(table.query || user || status));
</script>

<Card class="p-0">
    <div class="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按发票号搜索" />
        <SearchBox bind:value={userSearch} placeholder="按用户名或邮箱筛选" />
        <select
            bind:value={status}
            onchange={() => (table.page = 1)}
            aria-label="按订单状态筛选"
            class="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            <option value="">全部状态</option>
            {#each Object.entries(orderStatus) as [value, meta] (value)}
                <option {value}>{meta.label}</option>
            {/each}
        </select>
    </div>

    {#if downloadError}<div class="p-4 pb-0"><Alert variant="destructive">{downloadError}</Alert></div>{/if}

    {#if invoices.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(invoices.error)}</Alert></div>
    {:else if !invoices.data}
        <Spinner centered />
    {:else if !invoices.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{filtered ? '没有匹配的发票。' : '还没有发票。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="number" label="发票号" />
                        <th scope="col" class="px-4 py-2 font-medium">账单对象</th>
                        <th scope="col" class="px-4 py-2 font-medium">金额</th>
                        <th scope="col" class="px-4 py-2 font-medium">状态</th>
                        <SortHeader {table} key="generated_at" label="生成时间" />
                        <th scope="col" class="px-4 py-2"><span class="sr-only">操作</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each invoices.data.items as invoice (invoice.id)}
                        {@const name = invoice.user.username ?? invoice.user.email ?? '未知用户'}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{invoice.number ?? `#${invoice.id}`}</td>
                            <td class="px-4 py-3 whitespace-nowrap">
                                {#if invoice.user.id}
                                    <Link href="/admin/users/{invoice.user.id}" class="text-primary hover:underline">{name}</Link>
                                {:else}
                                    {name}
                                {/if}
                            </td>
                            <td class="px-4 py-3 font-semibold whitespace-nowrap">{invoice.total !== null ? formatMoney(invoice.total) : '—'}</td>
                            <td class="px-4 py-3">
                                {#if invoice.status}
                                    {@const meta = statusOf(invoice.status)}
                                    <span class={cn(pill, meta.class)}>{meta.label}</span>
                                {:else}—{/if}
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">{invoice.generatedAt ? when(invoice.generatedAt) : '待生成'}</td>
                            <td class="px-4 py-3 text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="下载发票 {invoice.number ?? invoice.id}"
                                    loading={downloading === invoice.id}
                                    disabled={!invoice.generatedAt}
                                    onclick={() => download(invoice.id, invoice.number)}
                                >
                                    <Download />
                                </Button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={invoices.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
