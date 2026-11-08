<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { deleteTask } from '$lib/api/schedules';
    import type { Schedule, Task } from '$lib/api/definitions/server';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import Button from '$lib/ui/button/Button.svelte';
    import { Plus } from '@lucide/svelte';
    import TaskDetailsModal from './TaskDetailsModal.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import TaskRow from './TaskRow.svelte';

    /** Task list of one schedule, ported from the task section of ScheduleEditContainer.tsx. */
    interface Props {
        schedule: Schedule;
        store: ServerStore;
    }

    let { schedule, store }: Props = $props();
    let showCreateTaskModal = $state(false);
    let editingTask: Task | undefined = $state();
    let deletingTaskId: number | undefined = $state();
    let confirmDeleteOpen = $state(false);

    const queryClient = useQueryClient();

    const sortedTasks = $derived(
        [...schedule.tasks].sort((a, b) => a.sequenceId - b.sequenceId)
    );

    // Errors propagate so ConfirmDialog stays open and shows them.
    async function handleDeleteTask(taskId: number) {
        if (!store.server) return;
        await deleteTask(store.server.uuid, schedule.id, taskId);
        void queryClient.invalidateQueries({ queryKey: ['server', store.server.id, 'schedules'] });
        deletingTaskId = undefined;
    }

    function handleEditTask(task: Task) {
        editingTask = task;
        showCreateTaskModal = true;
    }

    function handleCreateTask() {
        editingTask = undefined;
        showCreateTaskModal = true;
    }

    function handleTaskSaved() {
        showCreateTaskModal = false;
        editingTask = undefined;
        // Prefix match: refreshes both this schedule and the list.
        void queryClient.invalidateQueries({ queryKey: ['server', store.server!.id, 'schedules'] });
    }

    async function handleConfirmDelete() {
        if (deletingTaskId !== undefined) {
            await handleDeleteTask(deletingTaskId);
        }
    }
</script>

<div class="rounded-lg border border-border overflow-hidden bg-card">
    {#if sortedTasks.length === 0}
        <div class="p-6 text-center">
            <p class="text-sm text-muted-foreground">此计划任务还没有任何任务。</p>
        </div>
    {:else}
        <div class="divide-y divide-border">
            {#each sortedTasks as task (task.id)}
                <TaskRow {task} {store} onEdit={() => handleEditTask(task)} onDelete={() => {
                    deletingTaskId = task.id;
                    confirmDeleteOpen = true;
                }} />
            {/each}
        </div>
    {/if}

    {#if store.can('schedule.update')}
        <div class="border-t border-border bg-muted/30 px-6 py-3">
            <Button
                size="sm"
                variant="outline"
                onclick={handleCreateTask}
                class="w-full"
            >
                <Plus class="mr-2 size-4" />
                添加任务
            </Button>
        </div>
    {/if}
</div>

{#if showCreateTaskModal}
    <TaskDetailsModal
        bind:visible={showCreateTaskModal}
        {schedule}
        {store}
        task={editingTask}
        onSaved={handleTaskSaved}
    />
{/if}

<ConfirmDialog
    bind:open={confirmDeleteOpen}
    title="确认删除"
    confirmLabel="删除任务"
    onConfirm={handleConfirmDelete}
>
    此操作无法撤销。
</ConfirmDialog>
