<script lang="ts">
    import { CheckCircle2, ChevronRight, CircleDashed, XCircle } from '@lucide/svelte';
    import { cn } from '$lib/utils/cn';

    /**
     * One tool call and its result.
     *
     * The arguments the model chose are shown in full, because that is what the
     * user approves when a call changes the server. The output is collapsed: it
     * is usually long, and it is the answer to the call rather than the action
     * itself.
     */
    type Props = {
        name: string;
        summary?: string;
        arguments?: Record<string, unknown>;
        status?: 'running' | 'done' | 'error';
        output?: string;
        class?: string;
    };

    let {
        name,
        summary = '',
        arguments: args = {},
        status = 'done',
        output = '',
        class: className,
    }: Props = $props();

    const labels: Record<string, string> = {
        server_info: '读取服务器配置',
        console_output: '读取控制台输出',
        server_variables: '读取启动参数',
        list_files: '列出文件',
        read_file: '读取文件',
        list_databases: '读取数据库',
        list_backups: '读取备份',
        list_schedules: '读取计划任务',
        activity_log: '读取活动日志',
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

    const label = $derived(labels[name] ?? name);

    const entries = $derived(
        Object.entries(args ?? {}).map(([key, value]) => ({
            key,
            value:
                typeof value === 'string'
                    ? value.length > 400
                        ? `${value.slice(0, 400)}…`
                        : value
                    : JSON.stringify(value),
        })),
    );

    const Icon = $derived(
        status === 'running' ? CircleDashed : status === 'error' ? XCircle : CheckCircle2,
    );

    const tone = $derived(
        status === 'running'
            ? 'text-muted-foreground'
            : status === 'error'
              ? 'text-destructive'
              : 'text-success',
    );
</script>

<div class={cn('rounded-lg border border-border bg-muted/30 text-sm', className)}>
    <div class="flex items-center gap-2 px-3 py-2">
        <Icon class={cn('size-4 shrink-0', tone, status === 'running' && 'animate-spin')} />
        <span class="font-medium">{label}</span>
        {#if summary && summary !== label}
            <span class="truncate text-muted-foreground">{summary}</span>
        {/if}
    </div>

    {#if entries.length > 0}
        <dl class="space-y-1 border-t border-border px-3 py-2 text-xs">
            {#each entries as entry (entry.key)}
                <div class="flex gap-2">
                    <dt class="shrink-0 font-mono text-muted-foreground">{entry.key}</dt>
                    <dd class="min-w-0 break-all font-mono text-foreground/90">{entry.value}</dd>
                </div>
            {/each}
        </dl>
    {/if}

    {#if output}
        <details class="group border-t border-border">
            <summary
                class="flex cursor-pointer list-none items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground
                       hover:text-foreground"
            >
                <ChevronRight class="size-3.5 transition-transform group-open:rotate-90" />
                查看结果
            </summary>
            <pre
                class="max-h-72 overflow-auto border-t border-border bg-background/60 px-3 py-2 font-mono text-xs
                       whitespace-pre-wrap text-foreground/80"
            >{output}</pre>
        </details>
    {/if}
</div>
