<script lang="ts">
    import { Ban, Play, RefreshCw, Square } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { IconButton } from '$lib/ui';
    import { AlertDialog } from '$lib/ui/dialog';

    /**
     * Power controls, ported from PowerButtons.tsx. Commands go over the socket as
     * `set state` events (Wings applies them asynchronously; the new status arrives as
     * a `status` event). Kill is guarded behind a confirm dialog because it can corrupt
     * data, and replaces Stop while the server is stopping.
     */
    let { store }: { store: ServerStore } = $props();

    const killable = $derived(store.status === 'stopping');

    let confirmKill = $state(false);

    function send(action: 'start' | 'stop' | 'restart' | 'kill') {
        confirmKill = false;
        store.instance?.send('set state', action);
    }

    function onDangerClick() {
        if (killable) {
            confirmKill = true;
        } else {
            send('stop');
        }
    }

    // The dialog closes itself once the server actually goes offline.
    $effect(() => {
        if (store.status === 'offline') confirmKill = false;
    });
</script>

<AlertDialog
    bind:open={confirmKill}
    title="强制停止进程"
    description="强制停止服务器可能导致数据损坏。"
    confirmLabel="继续"
    destructive
    onConfirm={() => send('kill')}
>
    <div class="rounded-lg bg-warning/10 p-4 text-sm">
        强制停止会立即结束进程，未写入磁盘的数据会丢失。
    </div>
</AlertDialog>

<div class="flex items-center gap-2">
    {#if store.can('control.start')}
        <IconButton label="启动" disabled={store.status !== 'offline'} onclick={() => send('start')}>
            <Play class="size-4" />
        </IconButton>
    {/if}
    {#if store.can('control.restart')}
        <IconButton label="重启" disabled={!store.status} onclick={() => send('restart')}>
            <RefreshCw class="size-4" />
        </IconButton>
    {/if}
    {#if store.can('control.stop')}
        <IconButton
            label={killable ? '强制停止' : '停止'}
            disabled={store.status === 'offline'}
            onclick={onDangerClick}
        >
            {#if killable}
                <Ban class="size-4 text-destructive" />
            {:else}
                <Square class="size-4" />
            {/if}
        </IconButton>
    {/if}
</div>
