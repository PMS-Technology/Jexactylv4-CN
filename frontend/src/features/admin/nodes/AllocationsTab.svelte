<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { Trash2 } from '@lucide/svelte';
    import {
        adminNodeKeys,
        createAllocations,
        deleteAllocation,
        deleteUnusedAllocations,
        getAllocations,
        type AdminAllocation,
        type AllocationQuery,
    } from '$lib/api/admin/nodes';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Textarea from '$lib/ui/Textarea.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import SearchBox from '../shared/SearchBox.svelte';
    import SortHeader from '../shared/SortHeader.svelte';
    import { TableState } from '../shared/table.svelte';

    /**
     * Node allocations, ported from NodeAllocationContainer and allocations/*. Differences:
     * - The legacy create form fired one request per IP without waiting or catching errors
     *   and merged the results into the cached page incorrectly; here requests run in order
     *   and every failure is listed.
     * - Deleting one allocation filtered the cache the wrong way round (kept only the
     *   deleted row); the table now refetches.
     * - Ports start at 1025: AssignmentService rejects 1024 although the request rules
     *   allow it. Ranges are capped at 1000 ports, like its PORT_RANGE_LIMIT for range
     *   strings; a start/end pair was not limited at all.
     * - The IP suggestions were read from the first page only.
     */
    let { nodeId }: { nodeId: number } = $props();

    const queryClient = useQueryClient();
    const canUpdate = $derived(app.can('nodes.update'));

    const table = new TableState<'ip' | 'port' | 'server_id'>();
    let onlyFree = $state(false);

    const params = $derived<AllocationQuery>({
        page: table.page,
        filters: { search: table.query || undefined, server_id: onlyFree ? '0' : undefined },
        sorts: table.sorts,
    });

    const allocations = createQuery(() => ({
        queryKey: [...adminNodeKeys.allocations(nodeId), params],
        queryFn: () => getAllocations(nodeId, params),
        placeholderData: keepPreviousData,
    }));

    // Distinct IPs already on the node, as one-click suggestions.
    const knownIps = createQuery(() => ({
        queryKey: [...adminNodeKeys.allocations(nodeId), 'ips'],
        queryFn: async () => [...new Set((await getAllocations(nodeId, { sorts: { ip: 'asc' } }, 100)).items.map(a => a.ip))],
    }));

    const refresh = () => queryClient.invalidateQueries({ queryKey: adminNodeKeys.allocations(nodeId) });

    // --- Create
    let ipText = $state('');
    let startPort = $state('');
    let endPort = $state('');
    let alias = $state('');
    let creating = $state(false);
    let createErrors = $state<string[]>([]);
    let created = $state('');

    const ips = $derived([...new Set(ipText.split(/[\s,]+/).map(s => s.trim()).filter(Boolean))]);
    // IPv4 (optionally /27–/32), IPv6, or a hostname the backend resolves with gethostbyname.
    const isAddress = (v: string) => {
        const [ip, bits, extra] = v.split('/');
        if (extra !== undefined) return false;
        if (/^\d+(\.\d+){3}$/.test(ip!)) {
            return ip!.split('.').every(o => Number(o) <= 255) && (bits === undefined || (/^\d+$/.test(bits) && +bits >= 27 && +bits <= 32));
        }
        if (bits !== undefined) return false;
        if (ip!.includes(':')) return /^[0-9a-f:]+$/i.test(ip!);
        return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z]([a-z0-9-]*[a-z0-9])?$/i.test(ip!);
    };
    const badIps = $derived(ips.filter(ip => !isAddress(ip)));
    const start = $derived(/^\d+$/.test(startPort.trim()) ? Number(startPort) : NaN);
    const end = $derived(endPort.trim() === '' ? null : /^\d+$/.test(endPort.trim()) ? Number(endPort) : NaN);

    const formErrors = $derived({
        ips: !ips.length ? '至少填写一个 IP 或 CIDR。' : badIps.length ? `无法识别：${badIps.join('、')}` : undefined,
        start: !(start >= 1025 && start <= 65535) ? '起始端口需要在 1025–65535 之间。' : undefined,
        end:
            end === null
                ? undefined
                : Number.isNaN(end) || end > 65535 || end < start
                  ? '结束端口需要不小于起始端口，且不超过 65535。'
                  : end - start + 1 > 1000
                    ? '一次最多添加 1000 个端口。'
                    : undefined,
        alias: alias.trim().length > 191 ? '别名不能超过 191 个字符。' : undefined,
    });
    const formValid = $derived(!Object.values(formErrors).some(Boolean));

    async function create(event: SubmitEvent) {
        event.preventDefault();
        if (!formValid || creating) return;

        creating = true;
        createErrors = [];
        created = '';
        const failed: string[] = [];
        let ok = 0;
        for (const ip of ips) {
            try {
                await createAllocations(nodeId, { ip, start_port: start, end_port: end, alias: alias.trim() || null });
                ok++;
            } catch (e) {
                failed.push(`${ip}：${httpErrorToHuman(e)}`);
            }
        }
        await refresh();
        createErrors = failed;
        if (ok) {
            created = `已为 ${ok} 个地址添加端口 ${start}${end && end !== start ? `–${end}` : ''}（已存在的端口会跳过）。`;
            if (!failed.length) ipText = '';
        }
        creating = false;
    }

    // --- Delete
    let deleting = $state<AdminAllocation | null>(null);
    let deleteOpen = $state(false);
    let clearOpen = $state(false);

    const removeOne = async () => {
        await deleteAllocation(nodeId, deleting!.id);
        await refresh();
    };

    const removeUnused = async () => {
        await deleteUnusedAllocations(nodeId);
        table.page = 1;
        await refresh();
    };
</script>

<ConfirmDialog bind:open={deleteOpen} title="删除分配" confirmLabel="删除" onConfirm={removeOne}>
    确定删除 <code class="rounded bg-muted px-1 font-mono">{deleting?.ip}:{deleting?.port}</code> 吗？
</ConfirmDialog>
<ConfirmDialog bind:open={clearOpen} title="删除所有未使用的分配" confirmLabel="全部删除" onConfirm={removeUnused}>
    这个节点上所有没有分配给服务器的端口都会被删除，已分配的不受影响。之后可以随时重新添加。
</ConfirmDialog>

<div class="grid gap-4 lg:grid-cols-12">
    <div class="lg:col-span-8">
        <Card class="p-0">
            <div class="flex flex-wrap items-center gap-3 border-b border-border p-4">
                <SearchBox bind:value={table.search} placeholder="搜索 IP、端口或别名" />
                <Checkbox
                    bind:checked={onlyFree}
                    onCheckedChange={() => (table.page = 1)}
                    label="只看未分配"
                />
            </div>

            {#if allocations.error}
                <div class="p-4"><Alert variant="destructive">{httpErrorToHuman(allocations.error)}</Alert></div>
            {:else if !allocations.data}
                <Spinner centered />
            {:else if !allocations.data.items.length}
                <p class="py-12 text-center text-sm text-muted-foreground">{table.query || onlyFree ? '没有匹配的分配。' : '这个节点还没有分配，先在右侧添加。'}</p>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border text-left text-xs text-muted-foreground">
                            <tr>
                                <SortHeader {table} key="ip" label="IP" />
                                <th scope="col" class="px-4 py-2 font-medium">别名</th>
                                <SortHeader {table} key="port" label="端口" />
                                <SortHeader {table} key="server_id" label="服务器" />
                                <th scope="col" class="px-4 py-2"><span class="sr-only">操作</span></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border">
                            {#each allocations.data.items as a (a.id)}
                                <tr>
                                    <td class="px-4 py-2 font-mono text-xs">{a.ip}</td>
                                    <td class="px-4 py-2 font-mono text-xs text-muted-foreground">{a.alias ?? ''}</td>
                                    <td class="px-4 py-2 font-mono text-xs">{a.port}</td>
                                    <td class="px-4 py-2">
                                        {#if a.serverId}
                                            <Link href="/admin/servers/{a.serverId}" class="text-primary hover:underline">{a.serverName ?? `#${a.serverId}`}</Link>
                                        {:else}
                                            <span class="text-muted-foreground">未分配</span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-2 text-right">
                                        {#if canUpdate && !a.serverId}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="size-7 text-destructive hover:text-destructive"
                                                aria-label="删除 {a.ip}:{a.port}"
                                                onclick={() => {
                                                    deleting = a;
                                                    deleteOpen = true;
                                                }}
                                            >
                                                <Trash2 />
                                            </Button>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
                <div class="px-4 pb-4">
                    <Pagination pagination={allocations.data.pagination} currentPage={table.page} onPageChange={p => (table.page = p)} />
                </div>
            {/if}
        </Card>
    </div>

    {#if canUpdate}
        <div class="space-y-4 lg:col-span-4">
            <Card>
                <CardHeader><CardTitle>添加分配</CardTitle></CardHeader>
                <CardContent>
                    <form class="space-y-4 text-sm" onsubmit={create}>
                        {#if created}<Alert variant="success">{created}</Alert>{/if}
                        {#if createErrors.length}
                            <Alert variant="destructive">
                                <ul class="list-disc space-y-1 pl-4">{#each createErrors as e (e)}<li>{e}</li>{/each}</ul>
                            </Alert>
                        {/if}
                        <div class="space-y-1.5">
                            <Label for="alloc-ips">IP 或 CIDR</Label>
                            <Textarea id="alloc-ips" bind:value={ipText} rows={3} class="font-mono" placeholder={'203.0.113.10\n198.51.100.0/29'} disabled={creating} error={ipText ? formErrors.ips : undefined} />
                            <p class="text-xs text-muted-foreground">每行或用逗号分隔一个。CIDR 支持 /27 到 /32。</p>
                            {#if knownIps.data?.length}
                                <div class="flex flex-wrap gap-1">
                                    {#each knownIps.data as ip (ip)}
                                        <button
                                            type="button"
                                            class="rounded border border-border px-1.5 py-0.5 font-mono text-xs hover:bg-accent disabled:opacity-50"
                                            disabled={creating || ips.includes(ip)}
                                            onclick={() => (ipText = ipText.trim() ? `${ipText.trim()}\n${ip}` : ip)}
                                        >
                                            + {ip}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1.5">
                                <Label for="alloc-start">起始端口</Label>
                                <Input id="alloc-start" inputmode="numeric" bind:value={startPort} placeholder="25565" class="font-mono" disabled={creating} error={startPort ? formErrors.start : undefined} />
                            </div>
                            <div class="space-y-1.5">
                                <Label for="alloc-end">结束端口</Label>
                                <Input id="alloc-end" inputmode="numeric" bind:value={endPort} placeholder="可选" class="font-mono" disabled={creating} error={formErrors.end} />
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <Label for="alloc-alias">别名</Label>
                            <Input id="alloc-alias" bind:value={alias} placeholder="可选，例如 mc.example.com" class="font-mono" disabled={creating} error={formErrors.alias} />
                            <p class="text-xs text-muted-foreground">用户看到的地址，留空则显示 IP。</p>
                        </div>
                        <div class="text-right">
                            <Button type="submit" loading={creating} disabled={!formValid}>添加</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
            <div class="text-right">
                <Button variant="outline" class="text-destructive" onclick={() => (clearOpen = true)}><Trash2 />删除所有未使用的分配</Button>
            </div>
        </div>
    {/if}
</div>
