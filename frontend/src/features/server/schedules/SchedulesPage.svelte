<script lang="ts">
    import { app } from '$lib/stores/app.svelte';
    import { httpErrorToHuman } from '$lib/api/http';
    import { formatDateTime } from '$lib/utils/format';
    import { createQuery } from '@tanstack/svelte-query';
    import { getSchedules } from '$lib/api/schedules';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Link from '$lib/components/Link.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Button from '$lib/ui/button/Button.svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import { Clock, Plus } from '@lucide/svelte';
    import EditScheduleModal from './EditScheduleModal.svelte';
    import ScheduleCronDisplay from './ScheduleCronDisplay.svelte';

    /** Schedule list, ported from ScheduleContainer.tsx and ScheduleRow.tsx. */
    let { store }: { store: ServerStore } = $props();
    let showCreateModal = $state(false);

    const query = createQuery(() => ({
        queryKey: ['server', store.server?.id, 'schedules'],
        queryFn: () => getSchedules(store.server!.uuid),
        enabled: !!store.server?.uuid,
    }));

    const isPending = $derived(query.isPending);
    const isError = $derived(query.isError);
    const data = $derived(query.data);
</script>

<svelte:head>
    <title>计划任务 | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-6 lg:p-8">
    <PageHeader title="计划任务" description="为服务器创建和编辑自动任务。" />

    {#if isPending}
        <div class="flex justify-center py-12">
            <Spinner />
        </div>
    {:else if isError}
        <Alert variant="destructive" title="加载失败" class="mb-6">
            {httpErrorToHuman(query.error)}
        </Alert>
    {:else if !data?.length}
        <div class="rounded-lg border border-border bg-card p-8 text-center">
            <Clock class="mx-auto mb-4 size-12 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">
                此服务器还未配置任何计划任务。
            </p>
        </div>
    {:else}
        <div class="space-y-3">
            {#each data as schedule (schedule.id)}
                <Link
                    href={`/server/${store.server?.id}/schedules/${schedule.id}`}
                    class="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
                >
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1 min-w-0">
                            <h3 class="font-medium text-foreground truncate">
                                {schedule.name}
                            </h3>
                            <p class="mt-1 text-sm text-muted-foreground">
                                上次运行：
                                {schedule.lastRunAt
                                    ? formatDateTime(schedule.lastRunAt)
                                    : '从未'}
                            </p>
                        </div>
                        <div class="flex flex-col items-end gap-2 md:flex-row md:items-center">
                            <ScheduleCronDisplay cron={schedule.cron} />
                            <div class="flex gap-2">
                                {#if schedule.isProcessing}
                                    <span class="inline-block whitespace-nowrap rounded-full bg-yellow-500/20 px-2.5 py-0.5 text-xs font-medium uppercase text-yellow-700 dark:text-yellow-200">
                                        处理中
                                    </span>
                                {:else if schedule.isActive}
                                    <span class="inline-block whitespace-nowrap rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium uppercase text-green-700 dark:text-green-200">
                                        活跃
                                    </span>
                                {:else}
                                    <span class="inline-block whitespace-nowrap rounded-full bg-neutral-500/20 px-2.5 py-0.5 text-xs font-medium uppercase text-neutral-700 dark:text-neutral-200">
                                        停用
                                    </span>
                                {/if}
                            </div>
                        </div>
                    </div>
                </Link>
            {/each}
        </div>
    {/if}

    {#if store.can('schedule.create')}
        <div class="mt-8 flex justify-end">
            <Button onclick={() => (showCreateModal = true)}>
                <Plus class="mr-2 size-4" />
                创建计划任务
            </Button>
        </div>
    {/if}

    {#if showCreateModal}
        <EditScheduleModal bind:visible={showCreateModal} {store} onSaved={() => (showCreateModal = false)} />
    {/if}
</div>
