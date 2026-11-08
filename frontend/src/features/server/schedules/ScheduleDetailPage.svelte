<script lang="ts">
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { httpErrorToHuman } from '$lib/api/http';
    import { formatDateTime } from '$lib/utils/format';
    import type { Schedule } from '$lib/api/definitions/server';
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { getSchedule, deleteSchedule, triggerSchedule } from '$lib/api/schedules';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Button from '$lib/ui/button/Button.svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import { Play, Trash2 } from '@lucide/svelte';
    import EditScheduleModal from './EditScheduleModal.svelte';
    import TaskList from './TaskList.svelte';
    import ScheduleCronDisplay from './ScheduleCronDisplay.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';

    /** Schedule detail page, ported from ScheduleEditContainer.tsx, RunScheduleButton.tsx and DeleteScheduleButton.tsx. */
    interface Props {
        params: Record<string, string>;
        store: ServerStore;
    }

    let { params, store }: Props = $props();
    let showEditModal = $state(false);
    let showDeleteConfirm = $state(false);
    let isDeleting = $state(false);

    const queryClient = useQueryClient();
    const scheduleId = parseInt(params.id ?? '0', 10);

    const query = createQuery(() => ({
        queryKey: ['server', store.server?.id, 'schedules', scheduleId],
        queryFn: () => getSchedule(store.server!.uuid, scheduleId),
        enabled: !!store.server?.uuid && !isNaN(scheduleId),
    }));

    const isPending = $derived(query.isPending);
    const isError = $derived(query.isError);
    const data = $derived(query.data);

    let actionError = $state('');
    let running = $state(false);

    // Errors propagate so ConfirmDialog stays open and shows them.
    async function handleDelete() {
        if (!store.server) return;
        isDeleting = true;
        try {
            await deleteSchedule(store.server.uuid, scheduleId);
            void queryClient.invalidateQueries({ queryKey: ['server', store.server.id, 'schedules'] });
            navigate(`/server/${store.server.id}/schedules`);
        } finally {
            isDeleting = false;
        }
    }

    async function handleRun() {
        if (!store.server || !data) return;
        running = true;
        actionError = '';
        try {
            await triggerSchedule(store.server.uuid, scheduleId);
            // Same optimistic flag the legacy RunScheduleButton set.
            queryClient.setQueryData<Schedule>(['server', store.server.id, 'schedules', scheduleId], s =>
                s ? { ...s, isProcessing: true } : s,
            );
        } catch (error) {
            console.error(error);
            actionError = httpErrorToHuman(error);
        } finally {
            running = false;
        }
    }
</script>

<svelte:head>
    <title>{data?.name ?? '计划任务'} | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-6 lg:p-8">
    {#if isPending}
        <div class="flex justify-center py-12">
            <Spinner />
        </div>
    {:else if isError}
        <Alert variant="destructive" title="加载失败" class="mb-6">
            {httpErrorToHuman(query.error)}
        </Alert>
    {:else if !data}
        <Alert variant="destructive" title="未找到" class="mb-6">
            此计划任务不存在。
        </Alert>
    {:else}
        {@const schedule = data}

        <div class="mb-8 flex items-start justify-between">
            <div>
                <PageHeader
                    title={schedule.name}
                    description={`上次运行：${
                        schedule.lastRunAt
                            ? formatDateTime(schedule.lastRunAt)
                            : '无'
                    } · 下次运行：${
                        schedule.nextRunAt
                            ? formatDateTime(schedule.nextRunAt)
                            : '无'
                    }`}
                />
            </div>
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

        {#if actionError}
            <Alert variant="destructive" class="mb-6">{actionError}</Alert>
        {/if}

        <!-- Cron display (desktop only) -->
        <div class="mb-6 hidden lg:block">
            <ScheduleCronDisplay cron={schedule.cron} detailed />
        </div>

        <!-- Tasks section -->
        <div class="mb-6">
            <TaskList {schedule} {store} />
        </div>

        <!-- Actions -->
        {#if store.can('schedule.update') || store.can('schedule.delete')}
            <div class="flex gap-3">
                {#if store.can('schedule.update')}
                    <Button onclick={() => (showEditModal = true)}>编辑</Button>
                    {#if data && data.tasks.length > 0}
                        <Button
                            variant="outline"
                            onclick={handleRun}
                            loading={running}
                            disabled={data.isProcessing || running}
                        >
                            <Play class="mr-2 size-4" />
                            立即运行
                        </Button>
                    {/if}
                {/if}

                {#if store.can('schedule.delete')}
                    <Button
                        variant="destructive"
                        onclick={() => (showDeleteConfirm = true)}
                        class="ml-auto"
                    >
                        <Trash2 class="mr-2 size-4" />
                        删除
                    </Button>
                {/if}
            </div>
        {/if}

        {#if showEditModal}
            <EditScheduleModal
                bind:visible={showEditModal}
                {store}
                editingSchedule={data}
                onSaved={() => (showEditModal = false)}
            />
        {/if}

        <ConfirmDialog
            bind:open={showDeleteConfirm}
            title="确认删除"
            confirmLabel="删除"
            onConfirm={handleDelete}
            disabled={isDeleting}
        >
            此操作无法撤销。所有任务将被移除，任何正在运行的进程都将被终止。
        </ConfirmDialog>
    {/if}
</div>
