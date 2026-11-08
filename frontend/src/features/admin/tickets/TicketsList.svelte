<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ArrowDown, ArrowUp, Plus, Search } from '@lucide/svelte';
    import { getAdminTickets, type TicketQuery } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import TicketStatusBadge from '$features/dashboard/tickets/TicketStatusBadge.svelte';

    /** Ticket list, ported from TicketsContainer.tsx. */
    let page = $state(1);
    let search = $state('');
    let debounced = $state('');
    type SortKey = 'id' | 'title' | 'status' | 'created_at';
    let sort = $state<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);

    $effect(() => {
        const value = search.trim();
        const timer = setTimeout(() => {
            // The legacy table ignored queries shorter than two characters.
            debounced = value.length >= 2 ? value : '';
            page = 1;
        }, 300);

        return () => clearTimeout(timer);
    });

    function toggleSort(key: SortKey) {
        sort = sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null;
        page = 1;
    }

    const params = $derived<TicketQuery>({
        page,
        filters: { title: debounced || undefined },
        sorts: sort ? { [sort.key]: sort.dir } : {},
    });

    const tickets = createQuery(() => ({
        queryKey: ['admin', 'tickets', params],
        queryFn: () => getAdminTickets(params),
        placeholderData: keepPreviousData,
    }));

    const when = (date: Date) =>
        Math.abs(differenceInHours(date, new Date())) > 48
            ? format(date, 'yyyy-MM-dd HH:mm')
            : formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
</script>

{#snippet sortHeader(key: SortKey, label: string)}
    <th scope="col" class="px-4 py-2 font-medium" aria-sort={sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort(key)}>
            {label}
            {#if sort?.key === key}
                {#if sort.dir === 'asc'}<ArrowUp class="size-3" />{:else}<ArrowDown class="size-3" />{/if}
            {/if}
        </button>
    </th>
{/snippet}

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div class="relative w-full max-w-xs">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
                type="search"
                bind:value={search}
                placeholder="按标题搜索"
                aria-label="按标题搜索工单"
                class="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
        </div>
        {#if app.can('tickets.create')}
            <Button href="/admin/tickets/new"><Plus />新建工单</Button>
        {/if}
    </div>

    {#if tickets.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(tickets.error)}</Alert></div>
    {:else if !tickets.data}
        <Spinner centered />
    {:else if !tickets.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{debounced ? '没有匹配的工单。' : '还没有工单。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        {@render sortHeader('id', 'ID')}
                        {@render sortHeader('title', '标题')}
                        {@render sortHeader('status', '状态')}
                        <th scope="col" class="px-4 py-2 font-medium">提交者</th>
                        <th scope="col" class="px-4 py-2 font-medium">负责人</th>
                        {@render sortHeader('created_at', '创建时间')}
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each tickets.data.items as ticket (ticket.id)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{ticket.id}</td>
                            <td class="px-4 py-3">
                                <Link href="/admin/tickets/{ticket.id}" class="font-medium text-primary hover:underline">{ticket.title}</Link>
                            </td>
                            <td class="px-4 py-3"><TicketStatusBadge status={ticket.status} /></td>
                            <td class="px-4 py-3 whitespace-nowrap">{ticket.user?.email ?? '已删除的用户'}</td>
                            <td class="px-4 py-3">
                                <span class="inline-flex items-center gap-2 whitespace-nowrap">
                                    {#if ticket.assignedTo}
                                        <Avatar src={ticket.assignedTo.avatarUrl} name={ticket.assignedTo.uuid} size={20} />
                                        {ticket.assignedTo.email}
                                    {:else}
                                        <span class="text-muted-foreground">未分配</span>
                                    {/if}
                                </span>
                            </td>
                            <td class="px-4 py-3 whitespace-nowrap">{when(ticket.createdAt)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={tickets.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
        </div>
    {/if}
</Card>
