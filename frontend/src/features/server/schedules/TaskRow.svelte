<script lang="ts">
    import { Clock, AlertCircle, Code, HardDrive, Archive, Pencil, Trash2 } from '@lucide/svelte';
    import type { Task } from '$lib/api/definitions/server';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import Button from '$lib/ui/button/Button.svelte';

    /** One task, ported from ScheduleTaskRow.tsx. */
    interface Props {
        task: Task;
        store: ServerStore;
        onEdit: () => void;
        onDelete: () => void;
    }

    let { task, store, onEdit, onDelete }: Props = $props();

    const actionLabels: Record<string, { label: string; icon: any }> = {
        command: { label: '发送命令', icon: Code },
        power: { label: '发送电源命令', icon: HardDrive },
        backup: { label: '创建备份', icon: Archive },
    };

    const powerActionLabels: Record<string, string> = {
        start: '启动服务器',
        restart: '重启服务器',
        stop: '关闭服务器',
        kill: '终止服务器',
    };

    const actionInfo = $derived(actionLabels[task.action] ?? { label: '未知操作', icon: Code });
    const Icon = $derived(actionInfo.icon);
</script>

<div class="flex items-start justify-between gap-4 p-4 hover:bg-muted/50 transition-colors">
    <div class="flex flex-1 items-start gap-3 min-w-0">
        <Icon class="mt-1 size-4 flex-shrink-0 text-muted-foreground" />
        <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">
                {actionInfo.label}
            </p>
            {#if task.payload}
                <div class="mt-2">
                    {#if task.action === 'backup'}
                        <p class="text-xs text-muted-foreground mb-1">忽略的文件和文件夹：</p>
                    {/if}
                    <code class="block break-words rounded bg-muted px-2 py-1 text-xs font-mono whitespace-pre-wrap">
                        {task.action === 'power'
                            ? powerActionLabels[task.payload] || task.payload
                            : task.payload}
                    </code>
                </div>
            {/if}
        </div>
    </div>

    <div class="flex flex-shrink-0 items-center gap-2">
        {#if task.continueOnFailure}
            <div class="flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1">
                <AlertCircle class="size-3 text-yellow-700 dark:text-yellow-200" />
                <span class="text-xs font-medium text-yellow-700 dark:text-yellow-200">
                    失败继续
                </span>
            </div>
        {/if}

        {#if task.sequenceId > 1 && task.timeOffset > 0}
            <div class="flex items-center gap-1 rounded-full bg-neutral-500/20 px-2 py-1">
                <Clock class="size-3 text-neutral-700 dark:text-neutral-200" />
                <span class="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                    {task.timeOffset}s 后
                </span>
            </div>
        {/if}

        {#if store.can('schedule.update')}
            <Button
                size="sm"
                variant="ghost"
                onclick={onEdit}
                class="hover:text-foreground"
                title="编辑任务"
                aria-label="编辑任务"
            >
                <Pencil class="size-4" />
            </Button>
        {/if}

        {#if store.can('schedule.update')}
            <Button
                size="sm"
                variant="ghost"
                onclick={onDelete}
                class="hover:text-red-600"
                title="删除任务"
                aria-label="删除任务"
            >
                <Trash2 class="size-4" />
            </Button>
        {/if}
    </div>
</div>
