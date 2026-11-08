<script lang="ts">
    import type { Snippet } from 'svelte';
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { Plus } from '@lucide/svelte';
    import { adminNestKeys, createNest, getNestList, type NestQuery } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';
    import NestDialog from './NestDialog.svelte';

    /** Nests, ported from NestsContainer.tsx. A new nest now opens its page. */
    let { nav }: { nav: Snippet } = $props();

    const table = new TableState<'id' | 'name'>();
    const queryClient = useQueryClient();

    const params = $derived<NestQuery>({ page: table.page, filters: { name: table.query || undefined }, sorts: table.sorts });
    const nests = createQuery(() => ({
        queryKey: [...adminNestKeys.all, 'list', params],
        queryFn: () => getNestList(params),
        placeholderData: keepPreviousData,
    }));

    let createOpen = $state(false);
</script>

<NestDialog
    bind:open={createOpen}
    nest={null}
    onSaved={async values => {
        const nest = await createNest(values);
        await queryClient.invalidateQueries({ queryKey: adminNestKeys.all });
        navigate(`/admin/nests/${nest.id}`);
    }}
/>

<PageHeader title="Nests" description="Nest 把同类游戏的 Egg 归在一起，Egg 决定服务器怎样安装和启动。">
    {#if app.can('nests.create')}<Button onclick={() => (createOpen = true)}><Plus />新建 Nest</Button>{/if}
</PageHeader>
{@render nav()}

<Card class="p-0">
    <div class="border-b border-border p-4">
        <SearchBox bind:value={table.search} placeholder="按名称搜索 Nest" />
    </div>
    {#if nests.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(nests.error)}</Alert></div>
    {:else if !nests.data}
        <Spinner centered />
    {:else if !nests.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的 Nest。' : '还没有 Nest。'}</p>
    {:else}
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        <SortHeader {table} key="id" label="ID" />
                        <SortHeader {table} key="name" label="名称" />
                        <th scope="col" class="px-4 py-2 font-medium">描述</th>
                        <th scope="col" class="px-4 py-2 font-medium">作者</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each nests.data.items as n (n.id)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{n.id}</td>
                            <td class="px-4 py-3 whitespace-nowrap"><Link href="/admin/nests/{n.id}" class="font-medium text-primary hover:underline">{n.name}</Link></td>
                            <td class="px-4 py-3 text-muted-foreground">{n.description ?? ''}</td>
                            <td class="px-4 py-3 text-xs text-muted-foreground">{n.author}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={nests.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
        </div>
    {/if}
</Card>
