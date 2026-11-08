<script lang="ts">
    import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
    import { format, formatDistanceToNowStrict } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ArrowDown, ArrowRight, ArrowUp, ClipboardList, Cog, FolderOpen, SquareTerminal, XCircle } from '@lucide/svelte';
    import { getAdminActivity, type ActivitySubject, type AdminActivityQuery } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import { describeActivity, parseHash } from '$lib/utils/activity';
    import { Button, Card, Spinner } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Input from '$lib/ui/Input.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Pagination from '$lib/components/Pagination.svelte';

    /**
     * Admin activity log, ported from ActivityLogsContainer.tsx: four debounced filters
     * (event and IP also settable from the URL hash), sortable time and event columns,
     * subject links and the metadata dialog.
     */
    const subjectHref = (subject: ActivitySubject): string | null => {
        switch (subject.type) {
            case 'server':
                return `/admin/servers/${subject.id}`;
            case 'user':
                return `/admin/users/${subject.id}`;
            case 'node':
                return `/admin/nodes/${subject.id}`;
            case 'nest':
                return `/admin/nests/${subject.id}`;
            case 'database_host':
                return `/admin/databases/${subject.id}`;
            case 'server_preset':
                return `/admin/servers/presets/${subject.id}`;
            case 'admin_role':
                return `/admin/users/roles/${subject.id}`;
            case 'ticket':
                return `/admin/tickets/${subject.id}`;
            case 'billing_category':
                return `/admin/billing/categories/${subject.id}`;
            default:
                return null;
        }
    };

    const filterFields = [
        { key: 'actor', label: '操作者', placeholder: '按用户名筛选' },
        { key: 'subject', label: '对象', placeholder: '按对象筛选' },
        { key: 'event', label: '事件', placeholder: '按事件键筛选' },
        { key: 'ip', label: 'IP 地址', placeholder: '按 IP 筛选' },
    ] as const;
    type FilterKey = (typeof filterFields)[number]['key'];

    // What the inputs show, and what the query uses 250 ms after typing stops.
    let inputs = $state<Record<FilterKey, string>>({ actor: '', subject: '', event: '', ip: '' });
    let filters = $state<Record<FilterKey, string>>({ actor: '', subject: '', event: '', ip: '' });

    // Event and IP links write the hash; a hash change overrides those two filters.
    $effect(() => {
        const hash = parseHash(router.hash);
        inputs.event = filters.event = hash.event ?? '';
        inputs.ip = filters.ip = hash.ip ?? '';
    });

    $effect(() => {
        const next = { ...inputs };
        const timer = setTimeout(() => {
            filters = next;
            page = 1;
        }, 250);

        return () => clearTimeout(timer);
    });

    let page = $state(1);
    let sort = $state<{ key: 'timestamp' | 'event'; dir: 'asc' | 'desc' }>({ key: 'timestamp', dir: 'desc' });

    function toggleSort(key: 'timestamp' | 'event') {
        sort = sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' };
        page = 1;
    }

    const params = $derived<AdminActivityQuery>({
        page,
        filters: {
            actor: filters.actor || undefined,
            subject: filters.subject || undefined,
            event: filters.event || undefined,
            ip: filters.ip || undefined,
        },
        sorts: { [sort.key]: sort.dir },
    });

    const logs = createQuery(() => ({
        queryKey: ['admin', 'activity', params],
        queryFn: () => getAdminActivity(params),
        placeholderData: keepPreviousData,
    }));

    const hasFilters = $derived(Object.values(inputs).some(Boolean));

    function clearFilters() {
        inputs = { actor: '', subject: '', event: '', ip: '' };
        if (router.hash) router.navigate('/admin/activity', { scroll: false });
    }

    let meta = $state<Record<string, unknown> | null>(null);
    let metaOpen = $state(false);
</script>

{#snippet sortHeader(key: 'timestamp' | 'event', label: string)}
    <th scope="col" class="px-4 py-2 font-medium" aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort(key)}>
            {label}
            {#if sort.key === key}
                {#if sort.dir === 'asc'}<ArrowUp class="size-3" />{:else}<ArrowDown class="size-3" />{/if}
            {/if}
        </button>
    </th>
{/snippet}

<svelte:head>
    <title>活动日志 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="活动日志" description="面板上所有管理操作的记录。">
        {#if hasFilters}
            <Button variant="ghost" size="sm" onclick={clearFilters}>清除筛选 <XCircle /></Button>
        {/if}
    </PageHeader>

    <Card class="p-0">
        <div class="flex flex-wrap items-end gap-4 border-b border-border p-4">
            {#each filterFields as field (field.key)}
                <label class="flex w-full flex-col gap-1 sm:w-52">
                    <span class="text-xs font-medium text-muted-foreground">{field.label}</span>
                    <Input bind:value={inputs[field.key]} placeholder={field.placeholder} class="h-8" />
                </label>
            {/each}
            {#if logs.isFetching && logs.data}<Spinner size="sm" />{/if}
        </div>

        {#if logs.error}
            <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(logs.error)}</Alert></div>
        {:else if !logs.data}
            <Spinner centered />
        {:else if !logs.data.items.length}
            <p class="py-12 text-center text-sm text-muted-foreground">{hasFilters ? '没有匹配的记录。' : '暂无活动记录。'}</p>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="border-b border-border text-left text-xs text-muted-foreground">
                        <tr>
                            <th scope="col" class="px-4 py-2 font-medium">ID</th>
                            {@render sortHeader('timestamp', '时间')}
                            <th scope="col" class="px-4 py-2 font-medium">操作者</th>
                            {@render sortHeader('event', '事件')}
                            <th scope="col" class="px-4 py-2 font-medium">IP</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        {#each logs.data.items as item (item.id)}
                            {@const parts = describeActivity(item.event, item.properties)}
                            <tr class="align-top">
                                <td class="px-4 py-3 font-mono text-xs whitespace-nowrap">{item.logId ?? '—'}</td>
                                <td class="px-4 py-3 whitespace-nowrap" title={formatDistanceToNowStrict(item.timestamp, { addSuffix: true, locale: zhCN })}>
                                    {format(item.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                                </td>
                                <td class="px-4 py-3">
                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <Avatar src={item.actor?.image} name={item.actor?.uuid ?? 'system'} size={20} />
                                        {#if item.actorId}
                                            <Link href="/admin/users/{item.actorId}" class="font-semibold text-primary hover:underline">
                                                {item.actor?.username ?? '系统'}
                                            </Link>
                                        {:else}
                                            <span class="font-semibold">{item.actor?.username ?? '系统'}</span>
                                        {/if}
                                        {#each item.subjects as subject, i (`${subject.type}-${subject.id}-${i}`)}
                                            {@const href = subjectHref(subject)}
                                            <span class="inline-flex items-center gap-1 text-muted-foreground" title={subject.type}>
                                                <ArrowRight class="size-3.5" />
                                                {#if href}
                                                    <Link {href} class="hover:text-primary">{subject.identifier ?? `#${subject.id}`}</Link>
                                                {:else}
                                                    {subject.identifier ?? `#${subject.id}`}
                                                {/if}
                                            </span>
                                        {:else}
                                            <span class="inline-flex items-center gap-1 text-muted-foreground/70" title="系统级操作，没有具体的服务器或用户对象">
                                                <ArrowRight class="size-3.5" /><Cog class="size-3.5" />系统
                                            </span>
                                        {/each}
                                    </div>
                                </td>
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-2">
                                        <Link
                                            href="/admin/activity#event={encodeURIComponent(item.event)}"
                                            class="font-mono text-xs text-muted-foreground hover:text-primary"
                                        >
                                            {item.event}
                                        </Link>
                                        {#if item.isApi}<span title="通过 API 密钥"><SquareTerminal class="size-4 text-muted-foreground" /></span>{/if}
                                        {#if item.event.startsWith('server:sftp.')}<span title="通过 SFTP"><FolderOpen class="size-4 text-muted-foreground" /></span>{/if}
                                        {#if item.hasAdditionalMetadata}
                                            <button
                                                type="button"
                                                class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                aria-label="查看附加元数据"
                                                onclick={() => {
                                                    meta = item.properties;
                                                    metaOpen = true;
                                                }}
                                            >
                                                <ClipboardList class="size-4" />
                                            </button>
                                        {/if}
                                    </div>
                                    <p class="mt-1 max-w-md break-words">
                                        {#if parts}
                                            {#each parts as part, i (i)}
                                                {#if part.strong}<strong class="font-semibold">{part.text}</strong>{:else}{part.text}{/if}
                                            {/each}
                                        {:else}
                                            {item.description ?? item.event}
                                        {/if}
                                    </p>
                                </td>
                                <td class="px-4 py-3 whitespace-nowrap">
                                    {#if item.ip}
                                        <Link href="/admin/activity#ip={encodeURIComponent(item.ip)}" class="font-mono text-xs hover:text-primary">
                                            {item.ip}
                                        </Link>
                                    {:else}—{/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <div class="px-4 pb-4">
                <Pagination pagination={logs.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
            </div>
        {/if}
    </Card>
</div>

<Dialog bind:open={metaOpen} title="元数据" class="max-w-lg">
    <pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{JSON.stringify(meta, null, 2)}</pre>
    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (metaOpen = false)}>关闭</Button>
    {/snippet}
</Dialog>
