<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { untrack } from 'svelte';
    import { getAllocations, createAllocation } from '$lib/api/network';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import type { Allocation } from '$lib/api/definitions/server';
    import { Button, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import AllocationRow from './AllocationRow.svelte';

    /** Ported from NetworkContainer.tsx, AllocationRow.tsx, DeleteAllocationButton.tsx */
    let { store }: { store: ServerStore } = $props();

    const queryClient = useQueryClient();

    let creatingAllocation = $state(false);
    let createError = $state('');

    const queryKey = ['server', store.server!.id, 'network', 'allocations'];

    // Seeded from the server object and refetched on mount, as the legacy SWR call was.
    const allocationsQuery = createQuery(() => ({
        queryKey,
        queryFn: () => getAllocations(store.server!.uuid),
        initialData: untrack(() => store.server!.allocations),
        initialDataUpdatedAt: 0,
    }));

    // Keep the shared server object (console address etc.) in step with the list.
    $effect(() => {
        const data = allocationsQuery.data;
        // patchServer reads store.server; untracked so the write cannot re-trigger this effect.
        if (data) untrack(() => store.patchServer({ allocations: data }));
    });

    function setPrimary(id: number | null) {
        if (id === null) {
            void queryClient.invalidateQueries({ queryKey });
            return;
        }
        queryClient.setQueryData<Allocation[]>(queryKey, list => list?.map(a => ({ ...a, isDefault: a.id === id })));
    }

    const allocations = $derived.by(() => allocationsQuery.data ?? []);
    const isLoading = $derived.by(() => allocationsQuery.isPending);
    const error = $derived.by(() => allocationsQuery.error);
    const allocationLimit = $derived(store.server?.featureLimits.allocations ?? 0);
    const canCreate = $derived(store.can('allocation.create'));

    async function handleCreateAllocation() {
        if (creatingAllocation || !canCreate) return;

        creatingAllocation = true;
        createError = '';

        try {
            const allocation = await createAllocation(store.server!.uuid);
            queryClient.setQueryData<Allocation[]>(queryKey, list => (list ?? []).concat(allocation));
        } catch (e) {
            createError = httpErrorToHuman(e);
            console.error(e);
        } finally {
            creatingAllocation = false;
        }
    }

    function onAllocationDeleted() {
        void queryClient.invalidateQueries({ queryKey });
    }
</script>

<svelte:head>
    <title>网络 | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
    <PageHeader title="网络" description="分配、编辑和删除此服务器的端口。" />

    {#if error}
        <Alert variant="destructive" title="错误">
            {httpErrorToHuman(error)}
        </Alert>
    {/if}

    {#if isLoading}
        <div class="flex justify-center py-12">
            <Spinner size="lg" />
        </div>
    {:else}
        <div class="space-y-2">
            {#each allocations as allocation (allocation.id)}
                <AllocationRow {allocation} {store} onDeleted={onAllocationDeleted} onPrimary={setPrimary} />
            {/each}
        </div>

        {#if allocationLimit > 0 && canCreate}
            {#if createError}
                <Alert variant="destructive" title="错误">
                    {createError}
                </Alert>
            {/if}

            <div class="flex flex-col items-end gap-4 sm:flex-row sm:items-center">
                <p class="flex-1 text-sm text-muted-foreground">
                    当前正在使用此服务器的 {allocations.length} 个（共 {allocationLimit} 个）允许分配。
                </p>
                {#if allocationLimit > allocations.length}
                    <Button
                        onclick={handleCreateAllocation}
                        loading={creatingAllocation}
                        disabled={creatingAllocation}
                    >
                        创建分配
                    </Button>
                {/if}
            </div>
        {/if}
    {/if}
</div>
