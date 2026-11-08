<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { CheckCircle2 } from '@lucide/svelte';
    import { adminBillingKeys, getBillingExceptions, resolveAllBillingExceptions, resolveBillingException, type ExceptionQuery } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import { exceptionType, pill, when } from './labels';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';

    /**
     * Billing exceptions, ported from exceptions/BillingExceptionsContainer.tsx and
     * BillingExceptionsTable.tsx. The legacy row button marked itself resolved without
     * waiting for the request, and "resolve all" reloaded the page without asking.
     */
    const table = new TableState<'id' | 'exception_type' | 'created_at'>();
    const queryClient = useQueryClient();

    const params = $derived<ExceptionQuery>({
        page: table.page,
        filters: { title: table.query || undefined },
        sorts: table.sorts,
    });

    const exceptions = createQuery(() => ({
        queryKey: [...adminBillingKeys.exceptions, params],
        queryFn: () => getBillingExceptions(params),
        placeholderData: keepPreviousData,
    }));

    let resolving = $state<string | null>(null);
    let error = $state('');
    let resolveAllOpen = $state(false);

    const refresh = () => queryClient.invalidateQueries({ queryKey: adminBillingKeys.exceptions });

    async function resolve(uuid: string) {
        resolving = uuid;
        error = '';
        try {
            await resolveBillingException(uuid);
            await refresh();
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            resolving = null;
        }
    }

    const resolveAll = async () => {
        await resolveAllBillingExceptions();
        table.page = 1;
        await refresh();
    };
</script>

<ConfirmDialog bind:open={resolveAllOpen} title="全部标记为已解决" confirmLabel="全部解决" onConfirm={resolveAll}>
    所有计费异常记录都会被删除，无法恢复。确定继续吗？
</ConfirmDialog>

{#if error}<Alert variant="destructive" class="mb-4">{error}</Alert>{/if}

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按标题搜索" />
        {#if exceptions.data?.items.length}
            <Button variant="outline" onclick={() => (resolveAllOpen = true)}><CheckCircle2 />全部解决</Button>
        {/if}
    </div>

    {#if exceptions.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(exceptions.error)}</Alert></div>
    {:else if !exceptions.data}
        <Spinner centered />
    {:else if !exceptions.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的异常。' : '没有待处理的计费异常。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="id" label="ID" />
                        <th scope="col" class="px-4 py-2 font-medium">异常</th>
                        <th scope="col" class="px-4 py-2 font-medium">处理建议</th>
                        <SortHeader {table} key="exception_type" label="类型" />
                        <SortHeader {table} key="created_at" label="创建时间" />
                        <th scope="col" class="px-4 py-2"><span class="sr-only">操作</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each exceptions.data.items as exception (exception.id)}
                        {@const type = exceptionType[exception.type] ?? { label: exception.type, class: 'bg-muted text-muted-foreground' }}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{exception.id}</td>
                            <td class="px-4 py-3 font-medium">{exception.title}</td>
                            <td class="px-4 py-3 text-muted-foreground">{exception.description}</td>
                            <td class="px-4 py-3"><span class={cn(pill, type.class)}>{type.label}</span></td>
                            <td class="px-4 py-3 whitespace-nowrap">{when(exception.createdAt)}</td>
                            <td class="px-4 py-3 text-right">
                                <Button size="sm" variant="outline" loading={resolving === exception.uuid} onclick={() => resolve(exception.uuid)}>
                                    <CheckCircle2 />解决
                                </Button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={exceptions.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
