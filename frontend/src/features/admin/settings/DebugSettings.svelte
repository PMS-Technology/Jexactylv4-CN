<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { format, formatDistanceToNowStrict } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { FileArchive, FileDown } from '@lucide/svelte';
    import { downloadLogArchive, downloadLogFile, getLogFiles } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { bytesToString } from '$lib/utils/format';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /** Panel log browser, ported from DebugSettings.tsx. */
    const logs = createQuery(() => ({ queryKey: ['admin', 'logs'], queryFn: getLogFiles }));

    const totals = $derived(
        (logs.data ?? []).reduce((t, l) => ({ errors: t.errors + l.errors, warnings: t.warnings + l.warnings }), { errors: 0, warnings: 0 }),
    );

    let downloading = $state<string | null>(null);
    let error = $state('');

    async function run(key: string, task: () => Promise<void>) {
        downloading = key;
        error = '';
        try {
            await task();
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            downloading = null;
        }
    }
</script>

<div class="space-y-4">
    {#if error || logs.error}
        <Alert variant="destructive">{error || httpErrorToHuman(logs.error)}</Alert>
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-sm text-muted-foreground">
            {#if !logs.data}
                正在检查面板日志……
            {:else if totals.errors > 0}
                在 {logs.data.length} 个日志文件中发现 {totals.errors} 个错误、{totals.warnings} 个警告。
            {:else}
                面板日志中没有发现错误。
            {/if}
        </p>
        <Button
            disabled={!logs.data?.length || downloading !== null}
            loading={downloading === '__archive__'}
            onclick={() => run('__archive__', downloadLogArchive)}
        >
            <FileArchive />{downloading === '__archive__' ? '打包中…' : '全部下载 (.zip)'}
        </Button>
    </div>

    <Card class="p-0">
        {#if !logs.data}
            <Spinner centered />
        {:else if !logs.data.length}
            <p class="py-12 text-center text-sm text-muted-foreground">没有日志文件。</p>
        {:else}
            <!-- relative: contains the sr-only header cell, which otherwise widens the page on mobile. -->
            <div class="relative overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="border-b border-border text-left text-xs text-muted-foreground">
                        <tr>
                            <th scope="col" class="px-4 py-2 font-medium">文件</th>
                            <th scope="col" class="px-4 py-2 font-medium">大小</th>
                            <th scope="col" class="px-4 py-2 font-medium">修改时间</th>
                            <th scope="col" class="px-4 py-2 font-medium">错误</th>
                            <th scope="col" class="px-4 py-2 font-medium">警告</th>
                            <th scope="col" class="px-4 py-2"><span class="sr-only">下载</span></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        {#each logs.data as log (log.name)}
                            <tr>
                                <td class="px-4 py-3"><code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{log.name}</code></td>
                                <td class="px-4 py-3 whitespace-nowrap">{bytesToString(log.size)}</td>
                                <td class="px-4 py-3 whitespace-nowrap" title={format(log.modifiedAt, 'yyyy-MM-dd HH:mm:ss')}>
                                    {formatDistanceToNowStrict(log.modifiedAt, { addSuffix: true, locale: zhCN })}
                                </td>
                                <td class="px-4 py-3 {log.errors > 0 ? 'text-destructive' : ''}">{log.errors}</td>
                                <td class="px-4 py-3 {log.warnings > 0 ? 'text-warning' : ''}">{log.warnings}</td>
                                <td class="px-4 py-3 text-right">
                                    <button
                                        type="button"
                                        class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
                                        aria-label="下载 {log.name}"
                                        disabled={downloading !== null}
                                        onclick={() => run(log.name, () => downloadLogFile(log.name))}
                                    >
                                        <FileDown class="size-4" />
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </Card>
</div>
