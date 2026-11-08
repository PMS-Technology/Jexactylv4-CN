<script lang="ts">
    import { setAllocationNotes, setPrimaryAllocation } from '$lib/api/network';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import type { Allocation } from '$lib/api/definitions/server';
    import { Button } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import DeleteAllocationButton from './DeleteAllocationButton.svelte';

    /** Ported from AllocationRow.tsx. */
    let {
        allocation,
        store,
        onDeleted,
        onPrimary,
    }: { allocation: Allocation; store: ServerStore; onDeleted?: () => void; onPrimary: (id: number | null) => void } =
        $props();

    let notesLoading = $state(false);
    let notesError = $state('');
    let notes = $state(allocation.notes || '');

    const canUpdate = $derived(store.can('allocation.update'));
    const canDelete = $derived(store.can('allocation.delete'));

    let notesTimeout: ReturnType<typeof setTimeout> | null = null;

    function handleNotesChange(value: string) {
        notes = value;
        notesError = '';

        if (notesTimeout) clearTimeout(notesTimeout);

        notesTimeout = setTimeout(() => {
            saveNotes(value);
        }, 750);
    }

    async function saveNotes(value: string) {
        notesLoading = true;
        notesError = '';

        try {
            await setAllocationNotes(store.server!.uuid, allocation.id, value || null);
        } catch (e) {
            notesError = httpErrorToHuman(e);
            console.error(e);
        } finally {
            notesLoading = false;
        }
    }

    // Optimistic like the legacy mutate; on failure the page refetches (`null`).
    async function makePrimary() {
        notesError = '';
        onPrimary(allocation.id);
        try {
            await setPrimaryAllocation(store.server!.uuid, allocation.id);
        } catch (e) {
            console.error(e);
            notesError = httpErrorToHuman(e);
            onPrimary(null);
        }
    }
</script>

<div class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-nowrap md:flex-row md:items-center">
    <!-- IP/Alias and Port -->
    <div class="flex w-full items-center gap-4 md:w-auto md:flex-1 md:flex-nowrap">
        <div class="flex flex-col gap-1 min-w-0 flex-1 md:w-40">
            {#if allocation.alias}
                <div class="flex items-center gap-2">
                    <code class="w-40 truncate text-sm font-mono font-medium">{allocation.alias}</code>
                    <CopyButton text={allocation.alias} label="" class="p-0 size-auto" />
                </div>
                <p class="text-xs uppercase text-muted-foreground select-none">主机名</p>
            {:else}
                <div class="flex items-center gap-2">
                    <code class="text-sm font-mono font-medium">{allocation.ip}</code>
                    <CopyButton text={allocation.ip} label="" class="p-0 size-auto" />
                </div>
                <p class="text-xs uppercase text-muted-foreground select-none">IP 地址</p>
            {/if}
        </div>

        <div class="flex flex-col gap-1">
            <code class="text-sm font-mono font-medium">{allocation.port}</code>
            <p class="text-xs uppercase text-muted-foreground select-none">端口</p>
        </div>
    </div>

    <!-- Notes -->
    <div class="w-full md:flex-1">
        {#if notesError}
            <Alert variant="destructive" class="mb-2">{notesError}</Alert>
        {/if}
        <textarea
            class="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="备注"
            value={notes}
            oninput={e => handleNotesChange(e.currentTarget.value)}
            readonly={!canUpdate}
        ></textarea>
        {#if notesLoading}
            <p class="mt-1 text-xs text-muted-foreground">正在保存…</p>
        {/if}
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 md:w-48 md:justify-end">
        {#if allocation.isDefault}
            <Button size="sm" disabled class="bg-blue-600 text-slate-50">主分配</Button>
        {:else}
            {#if canDelete}
                <DeleteAllocationButton allocationId={allocation.id} {store} onDeleted={() => onDeleted?.()} />
            {/if}
            {#if canUpdate}
                <Button
                    variant="outline"
                    size="sm"
                    onclick={makePrimary}
                    class="text-xs"
                >
                    设为主分配
                </Button>
            {/if}
        {/if}
    </div>
</div>
