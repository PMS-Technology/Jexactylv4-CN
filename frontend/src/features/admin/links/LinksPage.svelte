<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2 } from '@lucide/svelte';
    import { deleteLink, getAdminLinks, type AdminLink, type LinkQuery } from '$lib/api/admin/appearance';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import LinkDialog from './LinkDialog.svelte';

    /** Custom links, ported from LinksContainer.tsx, LinksTable.tsx and the two dialogs. */
    const queryClient = useQueryClient();

    let page = $state(1);
    let search = $state('');
    let debounced = $state('');
    type SortKey = 'id' | 'name' | 'visible';
    let sort = $state<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null);

    $effect(() => {
        const value = search.trim();
        const timer = setTimeout(() => {
            // The legacy table ignored queries shorter than two characters.
            debounced = value.length >= 2 ? value : '';
            page = 1;
        }, 300);

        return () => clearTimeout(timer);
    });

    function toggleSort(key: SortKey) {
        sort = sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null;
        page = 1;
    }

    const params = $derived<LinkQuery>({
        page,
        filters: { name: debounced || undefined },
        sorts: sort ? { [sort.key]: sort.dir } : {},
    });

    const links = createQuery(() => ({
        queryKey: ['admin', 'links', params],
        queryFn: () => getAdminLinks(params),
        placeholderData: keepPreviousData,
    }));

    // The client sidebar reads `/api/client/links`; refresh both after a change.
    const refresh = () =>
        Promise.all([
            queryClient.invalidateQueries({ queryKey: ['admin', 'links'] }),
            queryClient.invalidateQueries({ queryKey: ['links'] }),
        ]);

    let editing = $state<AdminLink | null>(null);
    let editorOpen = $state(false);
    let deleting = $state<AdminLink | null>(null);
    let deleteOpen = $state(false);

    function openEditor(link: AdminLink | null) {
        editing = link;
        editorOpen = true;
    }

    async function remove() {
        if (!deleting) return;
        await deleteLink(deleting.id);
        await refresh();
    }
</script>

{#snippet sortHeader(key: SortKey, label: string)}
    <th scope="col" class="px-4 py-2 font-medium" aria-sort={sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort(key)}>
            {label}
            {#if sort?.key === key}
                {#if sort.dir === 'asc'}<ArrowUp class="size-3" />{:else}<ArrowDown class="size-3" />{/if}
            {/if}
        </button>
    </th>
{/snippet}

<svelte:head>
    <title>自定义链接 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="自定义链接" description="为用户创建指向外部站点的链接，显示在用户端侧边栏。">
        {#if app.can('links.create')}
            <Button onclick={() => openEditor(null)}><Plus />新建链接</Button>
        {/if}
    </PageHeader>

    <Card class="p-0">
        <div class="border-b border-border p-4">
            <div class="relative w-full max-w-xs">
                <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="search"
                    bind:value={search}
                    placeholder="按名称搜索"
                    aria-label="按名称搜索链接"
                    class="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                />
            </div>
        </div>

        {#if links.error}
            <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(links.error)}</Alert></div>
        {:else if !links.data}
            <Spinner centered />
        {:else if !links.data.items.length}
            <p class="py-12 text-center text-sm text-muted-foreground">{debounced ? '没有匹配的链接。' : '还没有自定义链接。'}</p>
        {:else}
            <!-- relative: contains the sr-only header cell, which otherwise widens the page on mobile. -->
            <div class="relative overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="border-b border-border text-left text-xs text-muted-foreground">
                        <tr>
                            {@render sortHeader('id', 'ID')}
                            {@render sortHeader('name', '名称')}
                            <th scope="col" class="px-4 py-2 font-medium">地址</th>
                            {@render sortHeader('visible', '可见性')}
                            <th scope="col" class="px-4 py-2"><span class="sr-only">操作</span></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        {#each links.data.items as link (link.id)}
                            <tr>
                                <td class="px-4 py-3 font-mono text-xs">{link.id}</td>
                                <td class="px-4 py-3 font-medium text-primary">{link.name}</td>
                                <td class="max-w-sm truncate px-4 py-3">
                                    <a href={link.url} target="_blank" rel="noreferrer" class="hover:underline" title={link.url}>{link.url}</a>
                                </td>
                                <td class="px-4 py-3">
                                    <span
                                        class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {link.visible
                                            ? 'bg-success/15 text-success'
                                            : 'bg-muted text-muted-foreground'}"
                                    >
                                        {link.visible ? '可见' : '隐藏'}
                                    </span>
                                </td>
                                <td class="px-4 py-3">
                                    <div class="flex justify-end gap-1">
                                        {#if app.can('links.update')}
                                            <button
                                                type="button"
                                                class="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                aria-label="编辑 {link.name}"
                                                onclick={() => openEditor(link)}
                                            >
                                                <Pencil class="size-4" />
                                            </button>
                                        {/if}
                                        {#if app.can('links.delete')}
                                            <button
                                                type="button"
                                                class="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                aria-label="删除 {link.name}"
                                                onclick={() => {
                                                    deleting = link;
                                                    deleteOpen = true;
                                                }}
                                            >
                                                <Trash2 class="size-4" />
                                            </button>
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <div class="px-4 pb-4">
                <Pagination pagination={links.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
            </div>
        {/if}
    </Card>
</div>

<LinkDialog bind:open={editorOpen} link={editing} onSaved={refresh} />

<ConfirmDialog bind:open={deleteOpen} title="删除自定义链接" confirmLabel="删除" onConfirm={remove}>
    <p>确定删除链接 <strong>{deleting?.name}</strong> 吗？用户将无法再使用它。</p>
</ConfirmDialog>
