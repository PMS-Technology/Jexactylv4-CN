<script lang="ts">
    import { formatDistanceToNow } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { formatDateTime } from '$lib/utils/format';
    import { Archive, Lock, MoreVertical } from '@lucide/svelte';
    import type { Backup } from '$lib/api/definitions/server';
    import { bytesToString } from '$lib/utils/format';
    import { Spinner, Button } from '$lib/ui';
    import { websocketEvent, type ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent } from '$lib/api/definitions/events';

    /** One backup, ported from BackupRow.tsx. */

    interface Props {
        backup: Backup;
        canDownload: boolean;
        canRestore: boolean;
        canDelete: boolean;
        onContextMenu?: () => void;
        store: ServerStore;
        /** Receives the parsed `backup completed:<uuid>` payload from Wings. */
        onCompleted: (payload: Record<string, any>) => void;
    }

    const { backup, canDownload, canRestore, canDelete, onContextMenu, store, onCompleted }: Props = $props();

    // Wings suffixes the event with the backup uuid; rows are keyed by uuid, so the
    // initial value is the only one this instance ever sees.
    // svelte-ignore state_referenced_locally
    websocketEvent(store, `${SocketEvent.BACKUP_COMPLETED}:${backup.uuid}`, (data: string) => {
        try {
            onCompleted(JSON.parse(data));
        } catch (e) {
            console.warn(e);
        }
    });

    const isCompleted = $derived(backup.completedAt !== null);
    const showActions = $derived(canDownload || canRestore || canDelete);
</script>

<div class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 md:flex-nowrap">
    <!-- Left section: Icon, name, checksum -->
    <div class="flex w-full flex-1 items-center gap-4 md:w-auto">
        <div class="flex-shrink-0">
            {#if !isCompleted}
                <Spinner class="size-5" />
            {:else if backup.isLocked}
                <Lock class="size-5 text-yellow-500" />
            {:else}
                <Archive class="size-5 text-muted-foreground" />
            {/if}
        </div>

        <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
                {#if isCompleted && !backup.isSuccessful}
                    <span class="inline-block rounded-full border border-destructive bg-destructive/10 px-2 py-0.5 text-xs font-medium uppercase text-destructive">
                        失败
                    </span>
                {/if}
                <p class="truncate font-semibold">{backup.name}</p>
                {#if isCompleted && backup.isSuccessful}
                    <span class="hidden text-xs text-muted-foreground sm:inline">
                        {bytesToString(backup.bytes)}
                    </span>
                {/if}
            </div>
            <p class="truncate font-mono text-xs text-muted-foreground">{backup.checksum}</p>
        </div>
    </div>

    <!-- Middle section: Created time -->
    <div class="w-full text-center md:w-48 md:text-right">
        <p class="text-sm" title={formatDateTime(backup.createdAt)}>
            {formatDistanceToNow(backup.createdAt, { includeSeconds: true, addSuffix: true, locale: zhCN })}
        </p>
        <p class="text-2xs font-medium uppercase text-muted-foreground">已创建</p>
    </div>

    <!-- Right section: Actions -->
    {#if showActions}
        <div class="flex-shrink-0">
            <Button
                variant="ghost"
                size="sm"
                onclick={onContextMenu}
                aria-label="备份操作"
                class="text-muted-foreground hover:text-foreground"
            >
                <MoreVertical class="size-5" />
            </Button>
        </div>
    {/if}
</div>
