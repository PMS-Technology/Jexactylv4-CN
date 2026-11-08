<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { XCircle } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { getServerActivity, type ServerActivityQuery } from '$lib/api/activity';
    import { httpErrorToHuman } from '$lib/api/http';
    import { router } from '$lib/router/router.svelte';
    import { app } from '$lib/stores/app.svelte';
    import { parseHash } from '$lib/utils/activity';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import ActivityEntry from './ActivityEntry.svelte';

    /**
     * Server activity log, ported from ServerActivityLogContainer.tsx. The event filter
     * lives in the URL hash (`#event=server:power.start`) like the legacy page, so a
     * filtered view can be bookmarked and the back button undoes a filter.
     */
    let { store }: { store: ServerStore } = $props();

    const event = $derived(parseHash(router.hash).event ?? '');

    let page = $state(1);

    // A new filter starts from the first page.
    $effect(() => {
        void event;
        page = 1;
    });

    const params = $derived<ServerActivityQuery>({
        page,
        filters: { event: event || undefined },
        sorts: { timestamp: -1 },
    });

    const activity = createQuery(() => ({
        queryKey: ['server', store.server!.uuid, 'activity', params],
        queryFn: () => getServerActivity(store.server!.uuid, params),
        placeholderData: keepPreviousData,
    }));

    const base = $derived(`/server/${store.server!.id}/activity`);
</script>

<svelte:head>
    <title>活动日志 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="活动日志" description="查看此服务器上最近的操作记录。">
        {#if event}
            <Button variant="ghost" size="sm" onclick={() => router.navigate(base, { scroll: false })}>
                清除筛选 <XCircle />
            </Button>
        {/if}
    </PageHeader>

    {#if event}
        <p class="mb-4 text-sm text-muted-foreground">
            当前筛选事件：<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{event}</code>
        </p>
    {/if}

    {#if activity.error}
        <Alert variant="destructive">{httpErrorToHuman(activity.error)}</Alert>
    {:else if !activity.data}
        <Spinner centered />
    {:else if !activity.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">
            {event ? '没有匹配此事件的活动记录。' : '此服务器暂无活动记录。'}
        </p>
    {:else}
        <Card class="overflow-hidden p-0">
            <ul class="divide-y divide-border">
                {#each activity.data.items as entry (entry.id)}
                    <ActivityEntry activity={entry} eventHref={`${base}#event=${encodeURIComponent(entry.event)}`} />
                {/each}
            </ul>
        </Card>

        <Pagination pagination={activity.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
    {/if}
</div>
