<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from '@lucide/svelte';
    import { deleteApiKey, getApiKeys, type ApiKeyQuery, type ApplicationApiKey } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Pagination from '$lib/components/Pagination.svelte';

    /** Application API key list, ported from ApiContainer.tsx and DeleteApiKeyButton.tsx. */
    const queryClient = useQueryClient();

    let page = $state(1);
    let search = $state('');
    let debounced = $state('');
    type SortKey = 'id' | 'identifier' | 'last_used_at';
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

    const params = $derived<ApiKeyQuery>({
        page,
        filters: { identifier: debounced || undefined },
        sorts: sort ? { [sort.key]: sort.dir } : {},
    });

    const keys = createQuery(() => ({
        queryKey: ['admin', 'api-keys', params],
        queryFn: () => getApiKeys(params),
        placeholderData: keepPreviousData,
    }));

    let pending = $state<ApplicationApiKey | null>(null);
    let confirmOpen = $state(false);

    async function remove() {
        if (!pending) return;
        await deleteApiKey(pending.id);
        await queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] });
    }

    const created = (date: Date) =>
        Math.abs(differenceInHours(date, new Date())) > 48
            ? format(date, 'yyyy-MM-dd HH:mm')
            : formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
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

<Card class="p-0">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div class="relative w-full max-w-xs">
            <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
                type="search"
                bind:value={search}
                placeholder="按标识符搜索"
                aria-label="按标识符搜索"
                class="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
        </div>
        {#if app.can('api.create')}
            <Button href="/admin/api/new"><Plus />新建 API 密钥</Button>
        {/if}
    </div>

    {#if keys.error}
        <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(keys.error)}</Alert></div>
    {:else if !keys.data}
        <Spinner centered />
    {:else if !keys.data.items.length}
        <p class="py-12 text-center text-sm text-muted-foreground">{debounced ? '没有匹配的密钥。' : '还没有应用 API 密钥。'}</p>
    {:else}
        <!-- relative: contains the sr-only header cell, which otherwise widens the page on mobile. -->
            <div class="relative overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                        {@render sortHeader('id', 'ID')}
                        {@render sortHeader('identifier', '标识符')}
                        <th scope="col" class="px-4 py-2 font-medium">备注</th>
                        {@render sortHeader('last_used_at', '最后使用')}
                        <th scope="col" class="px-4 py-2 font-medium">创建时间</th>
                        <th scope="col" class="px-4 py-2"><span class="sr-only">操作</span></th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border">
                    {#each keys.data.items as key (key.id)}
                        <tr>
                            <td class="px-4 py-3 font-mono text-xs">{key.id}</td>
                            <td class="px-4 py-3 font-mono text-xs text-primary">{key.identifier}</td>
                            <td class="max-w-xs truncate px-4 py-3" title={key.description}>{key.description}</td>
                            <td class="px-4 py-3 whitespace-nowrap">{key.lastUsedAt ? format(key.lastUsedAt, 'yyyy-MM-dd HH:mm') : '从未使用'}</td>
                            <td class="px-4 py-3 whitespace-nowrap">{created(key.createdAt)}</td>
                            <td class="px-4 py-3 text-right">
                                {#if app.can('api.delete')}
                                    <button
                                        type="button"
                                        class="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        aria-label="删除密钥 {key.identifier}"
                                        onclick={() => {
                                            pending = key;
                                            confirmOpen = true;
                                        }}
                                    >
                                        <Trash2 class="size-4" />
                                    </button>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <div class="px-4 pb-4">
            <Pagination pagination={keys.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
        </div>
    {/if}
</Card>

<ConfirmDialog bind:open={confirmOpen} title="确认删除 API 密钥" confirmLabel="删除" onConfirm={remove}>
    <p>删除密钥 <code class="font-mono">{pending?.identifier}</code> 会立即撤销它的全部访问权限，此操作无法撤销。</p>
</ConfirmDialog>
