<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { Plus } from '@lucide/svelte';
    import { adminDatabaseKeys, createDatabaseHost, getDatabaseHosts, hostAddress, type DatabaseHostQuery } from '$lib/api/admin/databases';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, Spinner } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import Link from '$lib/components/Link.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';
    import DatabaseHostForm from './DatabaseHostForm.svelte';

    /**
     * Database hosts, ported from DatabasesContainer.tsx and DatabasesTable.tsx. The
     * legacy status column ran a browser `fetch('host:port')`, which never reaches a
     * MySQL server (a bare IP resolves as a relative URL on the panel, a hostname fails
     * as an unknown scheme), so it showed a heart or a warning regardless of the host.
     * It is dropped; saving a host is the real connection test.
     */
    const table = new TableState<'id' | 'name' | 'host'>();
    const queryClient = useQueryClient();

    const params = $derived<DatabaseHostQuery>({
        page: table.page,
        filters: { name: table.query || undefined },
        sorts: table.sorts,
    });

    const hosts = createQuery(() => ({
        queryKey: [...adminDatabaseKeys.all, 'list', params],
        queryFn: () => getDatabaseHosts(params),
        placeholderData: keepPreviousData,
    }));

    let createOpen = $state(false);
</script>

<svelte:head>
    <title>数据库主机 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<Dialog bind:open={createOpen} title="新建数据库主机" class="sm:max-w-xl">
    {#if createOpen}
        <DatabaseHostForm
            id="new-database-host"
            submitLabel="创建"
            onSubmit={async values => {
                const host = await createDatabaseHost(values);
                await queryClient.invalidateQueries({ queryKey: adminDatabaseKeys.all });
                createOpen = false;
                navigate(`/admin/databases/${host.id}`);
            }}
        />
    {/if}
</Dialog>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="数据库主机" description="服务器可以在这些 MySQL / MariaDB 主机上创建数据库。">
        {#if app.can('databases.create')}
            <Button onclick={() => (createOpen = true)}><Plus />新建数据库主机</Button>
        {/if}
    </PageHeader>

    <Card class="p-0">
        <div class="border-b border-border p-4">
            <SearchBox bind:value={table.search} placeholder="按名称搜索" />
        </div>

        {#if hosts.error}
            <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(hosts.error)}</Alert></div>
        {:else if !hosts.data}
            <Spinner centered />
        {:else if !hosts.data.items.length}
            <p class="py-12 text-center text-sm text-muted-foreground">{table.query ? '没有匹配的数据库主机。' : '还没有数据库主机。'}</p>
        {:else}
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="border-b border-border text-left text-xs text-muted-foreground">
                        <tr>
                            <SortHeader {table} key="id" label="ID" />
                            <SortHeader {table} key="name" label="名称" />
                            <SortHeader {table} key="host" label="地址" />
                            <th scope="col" class="px-4 py-2 font-medium">用户名</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        {#each hosts.data.items as host (host.id)}
                            <tr>
                                <td class="px-4 py-3 font-mono text-xs">{host.id}</td>
                                <td class="px-4 py-3">
                                    <Link href="/admin/databases/{host.id}" class="font-medium text-primary hover:underline">{host.name}</Link>
                                </td>
                                <td class="px-4 py-3">
                                    <span class="inline-flex items-center gap-1">
                                        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{hostAddress(host)}</code>
                                        <CopyButton text={hostAddress(host)} label="" class="px-1" />
                                    </span>
                                </td>
                                <td class="px-4 py-3 font-mono text-xs">{host.username}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <div class="px-4 pb-4">
                <Pagination pagination={hosts.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
            </div>
        {/if}
    </Card>
</div>
