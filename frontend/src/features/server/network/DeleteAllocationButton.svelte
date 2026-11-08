<script lang="ts">
    import { Trash2 } from '@lucide/svelte';
    import { deleteAllocation } from '$lib/api/network';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { Button, ConfirmDialog } from '$lib/ui';

    let { allocationId, store, onDeleted }: { allocationId: number; store: ServerStore; onDeleted?: () => void } = $props();

    let showConfirm = $state(false);
    let deleting = $state(false);

    /** Ported from DeleteAllocationButton.tsx. Errors propagate so ConfirmDialog shows them. */
    async function handleDelete() {
        deleting = true;
        try {
            await deleteAllocation(store.server!.uuid, allocationId);
            onDeleted?.();
        } finally {
            deleting = false;
        }
    }
</script>

<ConfirmDialog
    bind:open={showConfirm}
    title="移除分配"
    confirmLabel="删除"
    onConfirm={handleDelete}
>
    此分配将立即从您的服务器中删除。
</ConfirmDialog>
<Button
    variant="destructive"
    size="sm"
    onclick={() => (showConfirm = true)}
    disabled={deleting}
    class="size-9 p-0"
    aria-label="删除分配"
>
    <Trash2 class="size-4" />
</Button>
