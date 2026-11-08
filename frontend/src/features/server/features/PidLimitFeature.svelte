<script lang="ts">
    import { TriangleAlert } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { SocketEvent } from '$lib/api/definitions/events';
    import { app } from '$lib/stores/app.svelte';
    import { Button } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import { lineMatches } from './index';

    /** Process/memory limit notice, ported from PIDLimitModalFeature.tsx. */
    let { store }: { store: ServerStore } = $props();

    const ERRORS = [
        'pthread_create failed',
        'failed to create thread',
        'unable to create thread',
        'unable to create native thread',
        'unable to create new native thread',
        'exception in thread "craft async scheduler management thread"',
    ];

    const isAdmin = $derived(Boolean(app.user?.rootAdmin));

    let open = $state(false);

    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => {
        if (store.status === 'running') return;

        if (lineMatches(line, ERRORS)) open = true;
    });
</script>

<Dialog bind:open title={isAdmin ? '已达到内存或进程上限' : '可能已达到资源上限'} preventClose>
    <div class="space-y-4 text-sm text-muted-foreground">
        <TriangleAlert class="size-10 text-warning" />
        {#if isAdmin}
            <p>此服务器已达到最大进程数或内存上限。</p>
            <p>
                调高 Wings 配置文件
                <code class="rounded bg-muted px-1 font-mono">config.yml</code>
                中的
                <code class="rounded bg-muted px-1 font-mono">container_pid_limit</code>
                可能解决此问题。
            </p>
            <p class="font-semibold text-foreground">注意：修改配置文件后必须重启 Wings 才能生效。</p>
        {:else}
            <p>此服务器尝试使用的资源超过了分配额度。请联系管理员并提供以下错误信息。</p>
            <p>
                <code class="rounded bg-muted px-1 font-mono">
                    pthread_create failed, Possibly out of memory or process/resource limits reached
                </code>
            </p>
        {/if}
    </div>

    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (open = false)}>关闭</Button>
    {/snippet}
</Dialog>
