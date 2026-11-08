<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { format } from 'date-fns';
    import type { ActivityLog } from '$lib/api/definitions/account';
    import { httpErrorToHuman, type PaginatedResult } from '$lib/api/http';
    import { describeActivity } from '$lib/utils/activity';
    import { Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';

    /**
     * Newest-first activity for one subject (a user or a server), standing in for the
     * legacy ActivityLogEntry lists on those pages. Event names link to the admin log
     * filtered by that event.
     */
    type Props = { queryKey: readonly unknown[]; load: (page: number) => Promise<PaginatedResult<ActivityLog>>; empty: string };
    let { queryKey, load, empty }: Props = $props();

    let page = $state(1);
    const activity = createQuery(() => ({
        queryKey: [...queryKey, 'activity', page],
        queryFn: () => load(page),
        placeholderData: keepPreviousData,
    }));
</script>

<Card class="p-0">
    {#if activity.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(activity.error)}</Alert></div>
    {:else if !activity.data}
        <Spinner centered />
    {:else if !activity.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{empty}</p>
    {:else}
        <ul class="divide-y divide-border">
            {#each activity.data.items as item (item.id)}
                {@const parts = describeActivity(item.event, item.properties)}
                <li class="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3 text-sm">
                    <span class="w-40 shrink-0 text-xs whitespace-nowrap text-muted-foreground">{format(item.timestamp, 'yyyy-MM-dd HH:mm:ss')}</span>
                    <span class="min-w-0 flex-1">
                        <span class="font-semibold">{item.actor?.username ?? '系统'}</span>
                        {#if parts}
                            {#each parts as part, i (i)}{#if part.strong}<strong>{part.text}</strong>{:else}{part.text}{/if}{/each}
                        {:else}
                            {item.description ?? ''}
                        {/if}
                        <Link href="/admin/activity#event={encodeURIComponent(item.event)}" class="ml-2 font-mono text-xs text-muted-foreground hover:text-primary">{item.event}</Link>
                    </span>
                    {#if item.ip}<span class="font-mono text-xs text-muted-foreground">{item.ip}</span>{/if}
                </li>
            {/each}
        </ul>
        <div class="px-4 pb-4">
            <Pagination pagination={activity.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
        </div>
    {/if}
</Card>
