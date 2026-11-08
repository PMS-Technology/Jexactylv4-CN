<script lang="ts">
    import { Ban, Play, RefreshCw, Square } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { Button } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';

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

<ConfirmDialog
    bind:open={confirmKill}
    title="强制停止进程"
    confirmLabel="继续"
    onConfirm={() => {
        send('kill');
    }}
>
    强制停止服务器可能导致数据损坏。
</ConfirmDialog>

<div class="flex items-center gap-2">
    {#if store.can('control.start')}
        <Button
            size="sm"
            variant="outline"
            disabled={store.status !== 'offline'}
            onclick={() => send('start')}
            title="启动"
        >
            <Play class="size-4" />
        </Button>
    {/if}
    {#if store.can('control.restart')}
        <Button
            size="sm"
            variant="outline"
            disabled={!store.status}
            onclick={() => send('restart')}
            title="重启"
        >
            <RefreshCw class="size-4" />
        </Button>
    {/if}
    {#if store.can('control.stop')}
        <Button
            size="sm"
            variant="outline"
            disabled={store.status === 'offline'}
            onclick={onDangerClick}
            title={killable ? '强制停止' : '停止'}
        >
            {#if killable}
                <Ban class="size-4 text-destructive" />
            {:else}
                <Square class="size-4" />
            {/if}
        </Button>
    {/if}
</div>
