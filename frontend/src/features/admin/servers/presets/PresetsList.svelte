<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { Check, Minus, Plus } from '@lucide/svelte';
    import { adminServerKeys, createPreset, getPresets, type PresetQuery } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import SearchBox from '../../shared/SearchBox.svelte';
    import SortHeader from '../../shared/SortHeader.svelte';
    import { TableState } from '../../shared/table.svelte';
    import PresetDialog from './PresetDialog.svelte';

    /** Server presets, ported from presets/ServerPresetContainer.tsx and ServerPresetsTable.tsx. */
    const table = new TableState<'id' | 'name' | 'cpu' | 'memory' | 'disk'>();
    const queryClient = useQueryClient();

    const params = $derived<PresetQuery>({ page: table.page, filters: { name: table.query || undefined }, sorts: table.sorts });
    const presets = createQuery(() => ({
        queryKey: [...adminServerKeys.presets, 'list', params],
        queryFn: () => getPresets(params),
        placeholderData: keepPreviousData,
    }));

    let createOpen = $state(false);
</script>

<PresetDialog
    bind:open={createOpen}
    preset={null}
    onSaved={async values => {
        const preset = await createPreset(values);
        await queryClient.invalidateQueries({ queryKey: adminServerKeys.presets });
        navigate(`/admin/servers/presets/${preset.id}`);
    }}
/>

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按名称搜索预设" />
        {#if app.can('server-presets.create')}<Button onclick={() => (createOpen = true)}><Plus />新建预设</Button>{/if}
    </div>
    {#if presets.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(presets.error)}</Alert></div>
    {:else if !presets.data}
        <Spinner centered />
    {:else if !presets.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的预设。' : '还没有服务器预设。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="name" label="名称" />
                        <th scope="col" class="px-4 py-2 font-medium">描述</th>
                        <SortHeader {table} key="cpu" label="CPU" />
                        <SortHeader {table} key="memory" label="内存" />
                        <SortHeader {table} key="disk" label="磁盘" />
                        <th scope="col" class="px-4 py-2 font-medium">指定 Egg</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each presets.data.items as p (p.id)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{p.id}</td>
                            <td class="px-4 py-3"><Link href="/admin/servers/presets/{p.id}" class="font-medium text-primary hover:underline">{p.name}</Link></td>
                            <td class="px-4 py-3 text-muted-foreground">{p.description ?? ''}</td>
                            <td class="px-4 py-3 whitespace-nowrap">{p.cpu}%</td>
                            <td class="px-4 py-3 whitespace-nowrap">{p.memory} MiB</td>
                            <td class="px-4 py-3 whitespace-nowrap">{p.disk} MiB</td>
                            <td class="px-4 py-3">
                                {#if p.eggId}<Check class="size-4 text-success" aria-label="已指定" />{:else}<Minus class="size-4 text-muted-foreground" aria-label="未指定" />{/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={presets.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
