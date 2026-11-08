<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { getServers } from '$lib/api/servers';
    import { app } from '$lib/stores/app.svelte';
    import { httpErrorToHuman } from '$lib/api/http';
    import { formatIp } from '$lib/utils/format';
    import { Dialog, Input, Label, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Global server search, ported from `@account/search/SearchModal.tsx`.
     *
     * The Formik auto-submit watcher + debounce becomes a debounced $effect feeding a
     * disabled-below-three-characters query — same observable behaviour (search fires
     * 500ms after typing pauses, only once at least three characters are present).
     */
    type Props = { open?: boolean };

    let { open = $bindable(false) }: Props = $props();

    let term = $state('');

    // Debounce the filter so typing does not fire a request per keystroke.
    let debounced = $state('');
    $effect(() => {
        const value = term;
        const timer = setTimeout(() => {
            debounced = value;
        }, 500);

        return () => clearTimeout(timer);
    });

    const resultsQuery = createQuery(() => ({
        queryKey: ['server-search', debounced],
        queryFn: () =>
            getServers({
                query: debounced,
                // Legacy parity: admins search every server, not just their own.
                ...(app.isAdmin ? { type: 'admin-all' } : {}),
            }),
        enabled: open && debounced.trim().length >= 3,
    }));

    // The legacy modal showed the first five matches.
    const results = $derived((resultsQuery.data?.items ?? []).slice(0, 5));
</script>

<Dialog bind:open title="搜索服务器" description="输入服务器名称、UUID 或 IP 地址开始搜索。">
    <div>
        <Label for="server-search-term">搜索关键词</Label>
        <div class="relative">
            <Input
                id="server-search-term"
                bind:value={term}
                placeholder="名称、UUID 或 IP 地址"
                autocomplete="off"
                class="pr-9"
            />
            {#if resultsQuery.isFetching}
                <Spinner
                    size="sm"
                    class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                />
            {/if}
        </div>
        {#if term.trim().length > 0 && term.trim().length < 3}
            <p class="mt-1.5 text-xs text-muted-foreground">请至少输入三个字符再开始搜索。</p>
        {/if}
    </div>

    {#if resultsQuery.isError}
        <Alert variant="destructive" class="mt-4">{httpErrorToHuman(resultsQuery.error)}</Alert>
    {:else if results.length > 0}
        <div class="mt-5 space-y-2">
            {#each results as server (server.uuid)}
                <!--
                    /server/* still renders through the legacy Preact shell, so this is a
                    plain anchor rather than the client-side Link — it must leave the SPA.
                -->
                <a
                    href={`/server/${server.id}`}
                    onclick={() => (open = false)}
                    class="flex items-center rounded-md border-l-4 border-border bg-card p-4
                           text-foreground no-underline transition-all duration-150
                           hover:border-primary hover:shadow"
                >
                    <div class="mr-4 min-w-0 flex-1">
                        <p class="truncate text-sm">{server.name}</p>
                        {#each server.allocations.filter(allocation => allocation.isDefault) as allocation (allocation.ip + allocation.port)}
                            <p class="mt-1 truncate font-mono text-xs text-muted-foreground">
                                {allocation.alias ?? formatIp(allocation.ip)}:{allocation.port}
                            </p>
                        {/each}
                    </div>
                    <span class="shrink-0 rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                        {server.node}
                    </span>
                </a>
            {/each}
        </div>
    {/if}
</Dialog>
