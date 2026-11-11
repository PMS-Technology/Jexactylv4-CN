<script lang="ts">
    import { z } from 'zod';
    import { useQueryClient } from '@tanstack/svelte-query';
    import { modifySchedule } from '$lib/api/schedules';
    import type { Schedule } from '$lib/api/definitions/server';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { Form } from '$lib/forms/form.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Button from '$lib/ui/button/Button.svelte';
    import Checkbox from '$lib/ui/checkbox/Checkbox.svelte';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { ChevronDown } from '@lucide/svelte';
    import ScheduleCheatsheet from './ScheduleCheatsheet.svelte';

    /**
     * Create/edit schedule dialog, ported from EditScheduleModal.tsx with ScheduleCheatsheetCards.
     * Parents mount it per open, so the initial values always match the schedule.
     */
    interface Props {
        store?: ServerStore;
        visible?: boolean;
        editingSchedule?: Schedule;
        onSaved?: () => void;
    }

    let { store, visible = $bindable(false), editingSchedule, onSaved }: Props = $props();
    let showCheatsheet = $state(false);

    const queryClient = useQueryClient();

    const schema = z.object({
        name: z.string().min(1, '计划任务名称不能为空'),
        minute: z.string(),
        hour: z.string(),
        dayOfMonth: z.string(),
        month: z.string(),
        dayOfWeek: z.string(),
        isActive: z.boolean(),
        onlyWhenOnline: z.boolean(),
    });

    type FormValues = z.infer<typeof schema>;

    const form = new Form({
        schema,
        initial: {
            name: editingSchedule?.name ?? '',
            minute: editingSchedule?.cron.minute ?? '*/5',
            hour: editingSchedule?.cron.hour ?? '*',
            dayOfMonth: editingSchedule?.cron.dayOfMonth ?? '*',
            month: editingSchedule?.cron.month ?? '*',
            dayOfWeek: editingSchedule?.cron.dayOfWeek ?? '*',
            isActive: editingSchedule?.isActive ?? true,
            onlyWhenOnline: editingSchedule?.onlyWhenOnline ?? true,
        } as FormValues,
        onSubmit: async (values) => {
            if (!store?.server) throw new Error('服务器信息不可用');

            await modifySchedule(store.server.uuid, {
                id: editingSchedule?.id,
                name: values.name,
                cron: {
                    minute: values.minute,
                    hour: values.hour,
                    dayOfMonth: values.dayOfMonth,
                    month: values.month,
                    dayOfWeek: values.dayOfWeek,
                },
                isActive: values.isActive,
                onlyWhenOnline: values.onlyWhenOnline,
            });

            queryClient.invalidateQueries({
                queryKey: ['server', store.server.id, 'schedules'],
            });

            if (editingSchedule) {
                queryClient.invalidateQueries({
                    queryKey: ['server', store.server.id, 'schedules', editingSchedule.id],
                });
            }

            onSaved?.();
        },
    });

    function handleOpenChange(open: boolean) {
        visible = open;
        if (!open) {
            form.reset();
            showCheatsheet = false;
        }
    }
</script>

<Dialog
    open={visible}
    onOpenChange={handleOpenChange}
    title={editingSchedule ? '编辑计划任务' : '创建新计划任务'}
>
    <div class="space-y-6">

        {#if form.errors._}
            <Alert variant="destructive" title="错误" class="text-sm">
                {form.errors._}
            </Alert>
        {/if}

        <form onsubmit={(e) => form.submit(e)} class="space-y-6">
            <!-- Schedule name -->
            <div class="space-y-2">
                <Label for="name">计划任务名称</Label>
                <Input
                    id="name"
                    type="text"
                    placeholder="输入一个易记的名称"
                    bind:value={form.values.name}
                    aria-invalid={!!form.errors.name}
                    onchange={() => form.clearError('name')}
                />
                {#if form.errors.name}
                    <p class="text-sm text-destructive">{form.errors.name}</p>
                {/if}
            </div>

            <!-- Cron fields -->
            <div>
                <p class="mb-4 text-sm font-medium text-foreground">Cron 表达式</p>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div class="space-y-1">
                        <Label for="minute" class="text-xs">分钟</Label>
                        <Input
                            id="minute"
                            type="text"
                            placeholder="*"
                            value={form.values.minute}
                            onchange={(e) => {
                                form.values.minute = e.currentTarget.value;
                                form.clearError('minute');
                            }}
                        />
                    </div>
                    <div class="space-y-1">
                        <Label for="hour" class="text-xs">小时</Label>
                        <Input
                            id="hour"
                            type="text"
                            placeholder="*"
                            value={form.values.hour}
                            onchange={(e) => {
                                form.values.hour = e.currentTarget.value;
                                form.clearError('hour');
                            }}
                        />
                    </div>
                    <div class="space-y-1">
                        <Label for="dayOfMonth" class="text-xs">日期</Label>
                        <Input
                            id="dayOfMonth"
                            type="text"
                            placeholder="*"
                            value={form.values.dayOfMonth}
                            onchange={(e) => {
                                form.values.dayOfMonth = e.currentTarget.value;
                                form.clearError('dayOfMonth');
                            }}
                        />
                    </div>
                    <div class="space-y-1">
                        <Label for="month" class="text-xs">月份</Label>
                        <Input
                            id="month"
                            type="text"
                            placeholder="*"
                            value={form.values.month}
                            onchange={(e) => {
                                form.values.month = e.currentTarget.value;
                                form.clearError('month');
                            }}
                        />
                    </div>
                    <div class="space-y-1">
                        <Label for="dayOfWeek" class="text-xs">周几</Label>
                        <Input
                            id="dayOfWeek"
                            type="text"
                            placeholder="*"
                            value={form.values.dayOfWeek}
                            onchange={(e) => {
                                form.values.dayOfWeek = e.currentTarget.value;
                                form.clearError('dayOfWeek');
                            }}
                        />
                    </div>
                </div>
                <p class="mt-2 text-xs text-muted-foreground">
                    计划任务系统支持 Cron 语法。使用上述字段指定任务应何时运行。
                </p>
            </div>

            <!-- Cheatsheet toggle -->
            <div class="rounded-lg border border-border bg-muted/50 p-4">
                <button
                    type="button"
                    onclick={() => (showCheatsheet = !showCheatsheet)}
                    class="flex w-full items-center justify-between text-sm font-medium hover:text-foreground"
                >
                    <span>显示 Cron 速查表</span>
                    <ChevronDown
                        class="size-4 transition-transform"
                        style={showCheatsheet ? 'transform: rotate(180deg)' : ''}
                    />
                </button>
                {#if showCheatsheet}
                    <div class="mt-4 border-t border-border pt-4">
                        <ScheduleCheatsheet />
                    </div>
                {/if}
            </div>

            <!-- Only when online toggle -->
            <div class="rounded-lg border border-border bg-muted/50 p-4">
                <Checkbox
                    checked={form.values.onlyWhenOnline}
                    onCheckedChange={checked => {
                        form.values.onlyWhenOnline = checked;
                    }}
                    label="仅在服务器在线时执行"
                />
                <p class="ml-7 mt-1 text-xs text-muted-foreground">
                    仅在服务器处于运行状态时执行此计划任务。
                </p>
            </div>

            <!-- Active toggle -->
            <div class="rounded-lg border border-border bg-muted/50 p-4">
                <Checkbox
                    checked={form.values.isActive}
                    onCheckedChange={checked => {
                        form.values.isActive = checked;
                    }}
                    label="启用计划任务"
                />
                <p class="ml-7 mt-1 text-xs text-muted-foreground">
                    启用后，此计划任务将自动执行。
                </p>
            </div>

            <div class="flex justify-end gap-3 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onclick={() => (visible = false)}
                >
                    取消
                </Button>
                <Button type="submit" disabled={form.submitting}>
                    {editingSchedule ? '保存更改' : '创建计划任务'}
                </Button>
            </div>
        </form>
    </div>
</Dialog>
