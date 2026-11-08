<script lang="ts">
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { SocketEvent } from '$lib/api/definitions/events';
    import { app } from '$lib/stores/app.svelte';
    import { Button } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import { lineMatches } from './index';

    /** SteamCMD out-of-disk notice, ported from SteamDiskSpaceFeature.tsx. */
    let { store }: { store: ServerStore } = $props();

    const isAdmin = $derived(Boolean(app.user?.rootAdmin));

    let open = $state(false);

    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => {
        if (store.status === 'running') return;

        if (lineMatches(line, ['steamcmd needs 250mb of free disk space to update', '0x202 after update job'])) {
            open = true;
        }
    });
</script>

<Dialog bind:open title="可用磁盘空间不足" preventClose>
    <div class="space-y-4 text-sm text-muted-foreground">
        {#if isAdmin}
            <p>此服务器的可用磁盘空间已耗尽，无法完成安装或更新。</p>
            <p>
                请在承载此服务器的机器上执行
                <code class="rounded bg-muted px-2 py-0.5 font-mono">df -h</code>
                确认剩余空间，删除文件或扩容后即可解决。
            </p>
        {:else}
            <p>此服务器的可用磁盘空间已耗尽，无法完成安装或更新。请联系管理员告知磁盘空间问题。</p>
        {/if}
    </div>

    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (open = false)}>关闭</Button>
    {/snippet}
</Dialog>
