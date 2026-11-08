<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Pencil, Plus, Trash2, Upload } from '@lucide/svelte';
    import { adminNestKeys, deleteNest, getNest, getNestEggs, updateNest, type EggQuery } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';
    import ImportEggDialog from './ImportEggDialog.svelte';
    import NestDialog from './NestDialog.svelte';

    /** One nest and its eggs, ported from NestEditContainer.tsx, NestEggTable.tsx and NestDeleteButton.tsx. */
    let { id }: { id: number } = $props();

    const queryClient = useQueryClient();
    const nest = createQuery(() => ({ queryKey: adminNestKeys.nest(id), queryFn: () => getNest(id) }));

    const table = new TableState<'id' | 'name'>();
    const params = $derived<EggQuery>({ page: table.page, filters: { name: table.query || undefined }, sorts: table.sorts });
    const eggs = createQuery(() => ({
        queryKey: [...adminNestKeys.eggs(id), params],
        queryFn: () => getNestEggs(id, params),
        placeholderData: keepPreviousData,
        enabled: app.can('eggs.read'),
    }));

    let editOpen = $state(false);
    let deleteOpen = $state(false);
    let importOpen = $state(false);

    const remove = async () => {
        await deleteNest(id);
        queryClient.removeQueries({ queryKey: adminNestKeys.nest(id) });
        await queryClient.invalidateQueries({ queryKey: adminNestKeys.all });
        navigate('/admin/nests');
    };
</script>

{#if nest.error && (nest.error as { response?: { status?: number } }).response?.status === 404}
    <NotFound backTo="/admin/nests" />
{:else if nest.error}
    <Alert variant="destructive">{httpErrorToHuman(nest.error)}</Alert>
{:else if !nest.data}
    <Spinner centered />
{:else}
    {@const n = nest.data}
    <NestDialog
        bind:open={editOpen}
        nest={n}
        onSaved={async values => {
            const updated = await updateNest(id, values);
            queryClient.setQueryData(adminNestKeys.nest(id), updated);
            await queryClient.invalidateQueries({ queryKey: [...adminNestKeys.all, 'list'] });
        }}
    />
    <ConfirmDialog bind:open={deleteOpen} title="删除 Nest" confirmLabel="删除" onConfirm={remove}>
        确定删除 <strong>{n.name}</strong> 吗？它下面的 Egg 会一起删除。还有服务器在用这个 Nest 时不能删除。
    </ConfirmDialog>
    <ImportEggDialog bind:open={importOpen} nestId={id} />

    <div class="mb-6 flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
            <h1 class="truncate font-header text-xl font-semibold">{n.name}</h1>
            <p class="truncate text-sm text-muted-foreground">{n.description ?? '没有描述'}</p>
        </div>
        <Button variant="ghost" href="/admin/nests"><ArrowLeft />返回</Button>
        {#if app.can('nests.update')}<Button variant="outline" onclick={() => (editOpen = true)}><Pencil />编辑</Button>{/if}
        {#if app.can('nests.delete')}<Button variant="destructive" onclick={() => (deleteOpen = true)}><Trash2 />删除</Button>{/if}
    </div>

    <Card class="mb-6">
        <CardHeader><CardTitle>详情</CardTitle></CardHeader>
        <CardContent class="grid gap-3 text-sm sm:grid-cols-3">
            <div class="min-w-0"><p class="text-xs text-muted-foreground">ID</p><p class="font-mono">{n.id}</p></div>
            <div class="min-w-0">
                <p class="text-xs text-muted-foreground">UUID</p>
                <p class="flex items-center gap-1 font-mono text-xs"><span class="truncate">{n.uuid}</span><CopyButton text={n.uuid} /></p>
            </div>
            <div class="min-w-0"><p class="text-xs text-muted-foreground">作者</p><p class="truncate">{n.author}</p></div>
        </CardContent>
    </Card>

    {#if app.can('eggs.read')}
        <Card class="p-0">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <SearchBox bind:value={table.search} placeholder="按名称搜索 Egg" />
                <div class="flex gap-2">
                    {#if app.can('eggs.import')}<Button variant="outline" onclick={() => (importOpen = true)}><Upload />导入</Button>{/if}
                    {#if app.can('eggs.create')}<Button href="/admin/nests/{id}/new"><Plus />新建 Egg</Button>{/if}
                </div>
            </div>
            {#if eggs.error}
                <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(eggs.error)}</Alert></div>
            {:else if !eggs.data}
                <Spinner centered />
            {:else if !eggs.data.items.length}
                <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的 Egg。' : '这个 Nest 还没有 Egg。'}</p>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border text-left text-xs text-muted-foreground">
                            <tr>
                                <SortHeader {table} key="id" label="ID" />
                                <SortHeader {table} key="name" label="名称" />
                                <th scope="col" class="px-4 py-2 font-medium">描述</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                            {#each eggs.data.items as e (e.id)}
                                <tr>
                                    <td class="px-4 py-3 font-mono text-xs">{e.id}</td>
                                    <td class="px-4 py-3 whitespace-nowrap"><Link href="/admin/nests/{id}/eggs/{e.id}" class="font-medium text-primary hover:underline">{e.name}</Link></td>
                                    <td class="max-w-xl px-4 py-3 text-muted-foreground"><p class="line-clamp-2">{e.description ?? ''}</p></td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
                <div class="px-4 pb-4">
                    <Pagination pagination={eggs.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
                </div>
            {/if}
        </Card>
    {/if}
{/if}
