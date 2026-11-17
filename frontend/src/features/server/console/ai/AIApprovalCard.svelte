<script lang="ts">
    import { ShieldAlert } from '@lucide/svelte';
    import type { AiPendingCall } from '$lib/api/serverAi';
    import { Button } from '$lib/ui';
    import { cn } from '$lib/utils/cn';

    /**
     * The approval card for a change the assistant wants to make.
     *
     * Nothing runs until the user decides here. The arguments of every call are
     * shown in full, because that is exactly what the user is agreeing to.
     */
    type Props = {
        calls: AiPendingCall[];
        status?: 'pending' | 'approved' | 'rejected';
        busy?: boolean;
        onDecide?: (decision: 'approve' | 'reject') => void;
    };

    let { calls, status = 'pending', busy = false, onDecide }: Props = $props();

    const labels: Record<string, string> = {
        run_command: '执行控制台命令',
        write_file: '写入文件',
        pull_file: '下载文件',
        create_directory: '创建目录',
        rename_file: '重命名文件',
        delete_file: '删除文件',
        set_variable: '修改启动参数',
        set_docker_image: '切换 Docker 镜像',
        power_action: '电源操作',
        create_database: '创建数据库',
        rotate_database_password: '轮换数据库密码',
        delete_database: '删除数据库',
        create_backup: '创建备份',
        restore_backup: '恢复备份',
        rename_server: '重命名服务器',
    };
</script>

<div
    class={cn(
        'rounded-lg border p-3',
        status === 'pending'
            ? 'border-warning/40 bg-warning/10'
            : status === 'approved'
              ? 'border-success/30 bg-success/10'
              : 'border-border bg-muted/40',
    )}
>
    <div class="flex items-start gap-2">
        <ShieldAlert class={cn('mt-0.5 size-4 shrink-0', status === 'pending' ? 'text-warning' : 'text-muted-foreground')} />
        <div class="min-w-0 flex-1 space-y-2">
            <p class="text-sm font-medium">
                {#if status === 'pending'}
                    助手请求执行以下操作，需要你的确认
                {:else if status === 'approved'}
                    已允许执行
                {:else}
                    已拒绝执行
                {/if}
            </p>

            {#each calls as call (call.id)}
                <div class="rounded-md border border-border bg-background/60 p-2">
                    <p class="text-sm">{call.summary || labels[call.name] || call.name}</p>
                    {#if Object.keys(call.arguments ?? {}).length > 0}
                        <dl class="mt-1 space-y-0.5 text-xs">
                            {#each Object.entries(call.arguments ?? {}) as [key, value] (key)}
                                <div class="flex gap-2">
                                    <dt class="shrink-0 font-mono text-muted-foreground">{key}</dt>
                                    <dd class="min-w-0 break-all font-mono text-foreground/90">
                                        {typeof value === 'string' ? value : JSON.stringify(value)}
                                    </dd>
                                </div>
                            {/each}
                        </dl>
                    {/if}
                </div>
            {/each}

            {#if status === 'pending'}
                <div class="flex gap-2 pt-1">
                    <Button size="sm" loading={busy} onclick={() => onDecide?.('approve')}>允许执行</Button>
                    <Button size="sm" variant="outline" disabled={busy} onclick={() => onDecide?.('reject')}>
                        拒绝
                    </Button>
                </div>
            {/if}
        </div>
    </div>
</div>
