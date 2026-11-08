<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { ArrowLeft, Banknote, Clock, Cog, Database, ExternalLink, ShieldAlert, SlidersHorizontal } from '@lucide/svelte';
    import { adminServerKeys, allocationText, getServer, getServerActivity, getServerDatabases } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import { pill } from '../billing/labels';
    import ActivityFeed from '../shared/ActivityFeed.svelte';
    import BillingTab from './BillingTab.svelte';
    import ManageTab from './ManageTab.svelte';
    import SettingsTab from './SettingsTab.svelte';
    import StartupTab from './StartupTab.svelte';
    import { serverStatus } from './limits';

    /**
     * One server, ported from ServerRouter.tsx. Differences: "view as user" linked to
     * `/server/<first 8 characters of the UUID>`, which is not the server's identifier
     * (`uuidShort`) on servers whose identifier was assigned separately; the databases tab
     * listed every database host instead of this server's databases.
     */
    let { id, tab }: { id: number; tab: string } = $props();

    const server = createQuery(() => ({ queryKey: adminServerKeys.server(id), queryFn: () => getServer(id) }));
    const databases = createQuery(() => ({
        queryKey: [...adminServerKeys.server(id), 'databases'],
        queryFn: () => getServerDatabases(id),
        enabled: tab === 'databases',
    }));

    // Owned here so it survives the tab remounting after a save refetches the server.
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);
    $effect(() => {
        void tab;
        notice = null;
    });

    const tabs = $derived(
        [
            { path: '', name: '设置', icon: Cog, show: true },
            { path: 'startup', name: '启动', icon: SlidersHorizontal, show: true },
            { path: 'databases', name: '数据库', icon: Database, show: true },
            { path: 'billing', name: '计费', icon: Banknote, show: Boolean(app.flags?.billing.enabled) || Boolean(server.data?.billingProductId) },
            { path: 'activity', name: '活动', icon: Clock, show: app.can('activity.read') },
            { path: 'manage', name: '管理', icon: ShieldAlert, show: app.can(['servers.update', 'servers.delete']) },
        ].filter(t => t.show),
    );
</script>

{#if server.error && (server.error as { response?: { status?: number } }).response?.status === 404}
    <NotFound backTo="/admin/servers" />
{:else if server.error}
    <Alert variant="destructive">{httpErrorToHuman(server.error)}</Alert>
{:else if !server.data}
    <Spinner centered />
{:else}
    {@const s = server.data}
    {@const st = serverStatus(s.status)}
    {@const primary = s.allocations.find(a => a.id === s.allocationId)}
    <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
            <h1 class="flex flex-wrap items-center gap-2 font-header text-xl font-semibold">
                <span class="truncate">{s.name}</span>
                <span class={cn(pill, st.class)}>{st.label}</span>
                {#if primary}<span class={cn(pill, 'bg-muted font-mono text-muted-foreground')}>{allocationText(primary)}</span>{/if}
                {#if s.billingProductId}<span class={cn(pill, 'bg-primary/15 text-primary')}>计费</span>{/if}
            </h1>
            <p class="truncate font-mono text-xs text-muted-foreground">{s.uuid} · {s.identifier}</p>
        </div>
        <Button variant="outline" href="/server/{s.identifier}"><ExternalLink />以用户视角查看</Button>
        <Button variant="ghost" href="/admin/servers"><ArrowLeft />返回列表</Button>
    </div>

    <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="服务器分类">
        {#each tabs as t (t.path)}
            {@const Icon = t.icon}
            <Link
                href={t.path ? `/admin/servers/${id}/${t.path}` : `/admin/servers/${id}`}
                end
                class="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                activeClass="border-primary! text-foreground font-medium"
            >
                <Icon class="size-4" />{t.name}
            </Link>
        {/each}
    </nav>

    {#key s.id}
        {#if tab === ''}
            {#key server.dataUpdatedAt}<SettingsTab server={s} bind:notice />{/key}
        {:else if tab === 'startup'}
            <StartupTab server={s} />
        {:else if tab === 'databases'}
            <Card class="p-0">
                {#if databases.error}
                    <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(databases.error)}</Alert></div>
                {:else if !databases.data}
                    <Spinner centered />
                {:else if !databases.data.length}
                    <p class="py-12 text-center text-sm text-muted-foreground">这台服务器没有数据库。用户可以在服务器面板里自己创建。</p>
                {:else}
                    <table class="w-full text-sm">
                        <thead class="border-b border-border text-left text-xs text-muted-foreground">
                            <tr>
                                <th scope="col" class="px-4 py-2 font-medium">数据库</th>
                                <th scope="col" class="px-4 py-2 font-medium">用户名</th>
                                <th scope="col" class="px-4 py-2 font-medium">允许连接自</th>
                                <th scope="col" class="px-4 py-2 font-medium">主机</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                            {#each databases.data as d (d.id)}
                                <tr>
                                    <td class="px-4 py-3 font-mono text-xs">{d.database}</td>
                                    <td class="px-4 py-3 font-mono text-xs">{d.username}</td>
                                    <td class="px-4 py-3 font-mono text-xs">{d.remote}</td>
                                    <td class="px-4 py-3"><Link href="/admin/databases/{d.hostId}" class="hover:underline">#{d.hostId}</Link></td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </Card>
        {:else if tab === 'billing'}
            {#key server.dataUpdatedAt}<BillingTab server={s} bind:notice />{/key}
        {:else if tab === 'activity'}
            <ActivityFeed queryKey={adminServerKeys.server(id)} load={p => getServerActivity(id, { page: p, sorts: { timestamp: 'desc' } })} empty="这台服务器还没有活动记录。" />
        {:else if tab === 'manage'}
            <ManageTab server={s} />
        {:else}
            <NotFound backTo="/admin/servers/{id}" />
        {/if}
    {/key}
{/if}
