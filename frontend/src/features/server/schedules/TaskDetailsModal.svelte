<script lang="ts">
    import { z } from 'zod';
    import { untrack } from 'svelte';
    import { modifyTask } from '$lib/api/schedules';
    import type { Schedule, Task } from '$lib/api/definitions/server';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { Form } from '$lib/forms/form.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Button from '$lib/ui/button/Button.svelte';
    import Checkbox from '$lib/ui/checkbox/Checkbox.svelte';
    import Select from '$lib/ui/select/Select.svelte';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Textarea from '$lib/ui/Textarea.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Create/edit task dialog, ported from TaskDetailsModal.tsx. Parents mount it per open,
     * so the initial values always come from the task being edited.
     */
    interface Props {
        store?: ServerStore;
        schedule: Schedule;
        task?: Task;
        visible?: boolean;
        onSaved?: () => void;
    }

    let { store, schedule, task, visible = $bindable(false), onSaved }: Props = $props();

    const schema = z.object({
        action: z.enum(['command', 'power', 'backup']),
        payload: z.string().refine(
            (val) => {
                // payload is required for command and power, but optional for backup
                const action = form.values.action;
                if (action === 'backup') return true;
                return val.length > 0;
            },
            { message: '此字段必填' }
        ),
        timeOffset: z.coerce
            .number()
            .min(0, '时间偏移必须至少为 0 秒')
            .max(900, '时间偏移必须小于 900 秒'),
        continueOnFailure: z.boolean(),
    });

    type FormValues = z.infer<typeof schema>;

    const ACTION_OPTIONS = [
        { value: 'command', label: '发送命令' },
        { value: 'power', label: '发送电源命令' },
        { value: 'backup', label: '创建备份' },
    ];

    const POWER_OPTIONS = [
        { value: 'start', label: '启动服务器' },
        { value: 'restart', label: '重启服务器' },
        { value: 'stop', label: '关闭服务器' },
        { value: 'kill', label: '终止服务器' },
    ];

    const form = new Form({
        schema,
        initial: {
            action: task?.action ?? 'command',
            payload: task?.payload ?? '',
            timeOffset: task?.timeOffset ?? 0,
            continueOnFailure: task?.continueOnFailure ?? false,
        } as FormValues,
        onSubmit: async (values) => {
            if (!store?.server) throw new Error('服务器信息不可用');

            // Check backup limit
            if (values.action === 'backup' && store.server.featureLimits.backups === 0) {
                throw new Error('服务器备份限制为 0，无法创建备份任务');
            }

            await modifyTask(store.server.uuid, schedule.id, task?.id, {
                action: values.action,
                payload: values.payload,
                timeOffset: values.timeOffset,
                continueOnFailure: values.continueOnFailure,
            });

            onSaved?.();
        },
    });

    function handleOpenChange(open: boolean) {
        visible = open;
        if (!open) {
            form.reset();
        }
    }

    // Ported from the legacy ActionListener: switching away from the initial action resets
    // the payload ('start' for power), switching back restores the original payload.
    $effect(() => {
        const action = form.values.action;
        untrack(() => {
            form.values.payload = action !== (task?.action ?? 'command') ? (action === 'power' ? 'start' : '') : (task?.payload ?? '');
        });
    });
</script>

<Dialog open={visible} onOpenChange={handleOpenChange} title={task ? '编辑任务' : '创建任务'}>
    <div class="space-y-6">

        {#if form.errors._}
            <Alert variant="destructive" title="错误" class="text-sm">
                {form.errors._}
            </Alert>
        {/if}

        <form onsubmit={(e) => form.submit(e)} class="space-y-6">
            <!-- Action and time offset -->
            <div class="grid gap-4 sm:grid-cols-3">
                <div class="sm:col-span-2 space-y-2">
                    <Select
                        id="action"
                        items={ACTION_OPTIONS}
                        value={form.values.action}
                        onValueChange={value => {
                            form.values.action = value as 'command' | 'power' | 'backup';
                        }}
                        label="操作"
                    />
                    {#if form.errors.action}
                        <p class="text-sm text-destructive">{form.errors.action}</p>
                    {/if}
                </div>

                <div class="space-y-2">
                    <Label for="timeOffset">时间偏移（秒）</Label>
                    <Input
                        id="timeOffset"
                        type="number"
                        min="0"
                        max="900"
                        placeholder="0"
                        value={String(form.values.timeOffset)}
                        onchange={(e) => {
                            form.values.timeOffset = parseInt(e.currentTarget.value, 10) || 0;
                            form.clearError('timeOffset');
                        }}
                    />
                    {#if form.errors.timeOffset}
                        <p class="text-sm text-destructive">{form.errors.timeOffset}</p>
                    {/if}
                </div>
            </div>

            <p class="text-xs text-muted-foreground">
                在前一个任务执行后等待的秒数。如果这是计划任务中的第一个任务，则不会应用此值。
            </p>

            <!-- Payload field -->
            <div class="space-y-2">
                {#if form.values.action === 'power'}
                    <Select
                        id="payload"
                        items={POWER_OPTIONS}
                        value={form.values.payload}
                        onValueChange={value => {
                            form.values.payload = value;
                        }}
                        label="电源命令"
                    />
                {:else}
                    <Label for="payload">
                        {form.values.action === 'command' ? '命令' : '忽略的文件'}
                    </Label>

                    {#if form.values.action === 'command'}
                        <Textarea
                            id="payload"
                            placeholder="输入要执行的命令"
                            value={form.values.payload}
                            onchange={(e) => {
                                form.values.payload = e.currentTarget.value;
                                form.clearError('payload');
                            }}
                            rows={6}
                        />
                    {:else}
                        <Textarea
                            id="payload"
                            placeholder="可选。要排除的文件和文件夹，每行一个。默认使用 .pteroignore 文件。"
                            value={form.values.payload}
                            onchange={(e) => {
                                form.values.payload = e.currentTarget.value;
                                form.clearError('payload');
                            }}
                            rows={6}
                        />
                        <p class="text-xs text-muted-foreground">
                            可选。如果已达到备份限制，最旧的备份将被轮换。
                        </p>
                    {/if}
                {/if}

                {#if form.errors.payload}
                    <p class="text-sm text-destructive">{form.errors.payload}</p>
                {/if}
            </div>

            <!-- Continue on failure -->
            <div class="rounded-lg border border-border bg-muted/50 p-4">
                <Checkbox
                    checked={form.values.continueOnFailure}
                    onCheckedChange={checked => {
                        form.values.continueOnFailure = checked;
                    }}
                    label="失败时继续"
                />
                <p class="ml-7 mt-1 text-xs text-muted-foreground">
                    当此任务失败时，后续任务仍会执行。
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
                    {task ? '保存更改' : '创建任务'}
                </Button>
            </div>
        </form>
    </div>
</Dialog>
