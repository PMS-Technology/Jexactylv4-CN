<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { Cog, Layers, Network, Trash2 } from '@lucide/svelte';
    import type { UserSummary } from '$lib/api/admin/modules';
    import {
        adminServerKeys,
        allocationText,
        deleteServer,
        getFreeAllocations,
        updateServer,
        type AdminServer,
    } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import UserPicker from '../tickets/UserPicker.svelte';
    import LimitFields from './LimitFields.svelte';
    import { limitErrors, limitsFromServer, toLimitPayload } from './limits';

    /**
     * Name, owner, limits and allocations, ported from ServerSettingsContainer.tsx,
     * settings/BaseSettingsBox, NetworkingBox and ServerDeleteButton. Differences: the
     * description can be edited (the legacy page did not send it, and the backend cleared
     * it on every save); the primary allocation cannot be ticked for removal; the add list
     * reads up to 100 free allocations instead of the first page of 20; the page refreshes
     * after saving (the legacy form reset only its own fields).
     */
    /** `notice` lives on the page: saving refetches the server, which remounts this tab. */
    let { server, notice = $bindable(null) }: { server: AdminServer; notice?: { variant: 'success' | 'destructive'; text: string } | null } = $props();

    const queryClient = useQueryClient();
    const canUpdate = $derived(app.can('servers.update'));

    let name = $state(server.name);
    let externalId = $state(server.externalId ?? '');
    let description = $state(server.description);
    let owner = $state<UserSummary | null>(
        server.owner ? { id: server.owner.id, uuid: server.owner.uuid, username: server.owner.username, email: server.owner.email, isAdmin: false, avatarUrl: server.owner.avatarUrl } : null,
    );
    let limits = $state(limitsFromServer(server));
    let allocationId = $state(String(server.allocationId));
    let add = $state<number[]>([]);
    let remove = $state<number[]>([]);
    let search = $state('');

    const free = createQuery(() => ({
        queryKey: ['admin', 'nodes', server.nodeId, 'allocations', 'free', search.trim()],
        queryFn: () => getFreeAllocations(server.nodeId, search.trim()),
        enabled: canUpdate,
    }));

    const lErrors = $derived(limitErrors(limits));
    const errors = $derived({
        name: !name.trim() || name.trim().length > 191 ? '名称需要 1–191 个字符。' : undefined,
        externalId: externalId.trim().length > 191 ? '不能超过 191 个字符。' : undefined,
        owner: owner ? undefined : '请选择所有者。',
    });
    const valid = $derived(!Object.values(errors).some(Boolean) && !Object.keys(lErrors).length);

    let saving = $state(false);

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        notice = null;
        try {
            await updateServer(server.id, {
                external_id: externalId.trim() || null,
                name: name.trim(),
                description: description.trim(),
                owner_id: owner!.id,
                ...toLimitPayload(limits),
                allocation_id: Number(allocationId),
                add_allocations: add,
                remove_allocations: remove,
            });
            add = [];
            remove = [];
            await queryClient.invalidateQueries({ queryKey: adminServerKeys.server(server.id) });
            await queryClient.invalidateQueries({ queryKey: [...adminServerKeys.all, 'list'] });
            await queryClient.invalidateQueries({ queryKey: ['admin', 'nodes', server.nodeId, 'allocations'] });
            notice = { variant: 'success', text: '服务器设置已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    let deleteOpen = $state(false);
    let force = $state(false);
    const remove_ = async () => {
        await deleteServer(server.id, force);
        queryClient.removeQueries({ queryKey: adminServerKeys.server(server.id) });
        await queryClient.invalidateQueries({ queryKey: adminServerKeys.all });
        navigate('/admin/servers');
    };

    const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
    const off = $derived(!canUpdate || saving);
    const select =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

<ConfirmDialog bind:open={deleteOpen} title="删除服务器" confirmLabel={force ? '强制删除' : '删除'} onConfirm={remove_}>
    <p>确定删除服务器 <strong>{server.name}</strong> 吗？服务器文件和它的数据库会一起删除。</p>
    <label class="flex items-start gap-2 rounded-md bg-muted/50 p-3">
        <input type="checkbox" class="mt-0.5 size-4 accent-primary" bind:checked={force} />
        <span>
            <span class="font-medium">强制删除</span>
            <span class="block text-xs text-muted-foreground">Wings 或数据库主机报错时也从面板删除。只在普通删除失败时使用，可能在节点上留下残余文件。</span>
        </span>
    </label>
</ConfirmDialog>

<form onsubmit={save} class="space-y-4">
    {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}

    <div class="grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Cog class="size-4" />基本信息</CardTitle></CardHeader>
                <CardContent class="space-y-4 text-sm">
                    <div class="space-y-1.5">
                        <Label for="set-name">名称</Label>
                        <Input id="set-name" bind:value={name} disabled={off} error={errors.name} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="set-description">描述</Label>
                        <Input id="set-description" bind:value={description} disabled={off} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="set-external">外部 ID</Label>
                        <Input id="set-external" bind:value={externalId} class="font-mono" disabled={off} error={errors.externalId} />
                    </div>
                    <div>
                        <UserPicker id="set-owner" label="所有者" selected={owner} disabled={off} onSelect={u => (owner = u)} />
                        <p class="mt-1.5 text-xs text-muted-foreground">更换所有者后，原所有者的控制台连接会被立即断开。</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Network class="size-4" />网络</CardTitle></CardHeader>
                <CardContent class="space-y-4 text-sm">
                    <div class="space-y-1.5">
                        <Label for="set-primary">主分配</Label>
                        <select id="set-primary" class={select} bind:value={allocationId} disabled={off}>
                            {#each server.allocations as a (a.id)}<option value={String(a.id)}>{allocationText(a)}</option>{/each}
                        </select>
                    </div>
                    {#if server.allocations.length > 1}
                        <div class="space-y-1.5">
                            <span class="text-sm font-medium">移除分配</span>
                            <div class="flex flex-wrap gap-2">
                                {#each server.allocations.filter(a => String(a.id) !== allocationId) as a (a.id)}
                                    <label class="flex items-center gap-1.5 rounded border border-border px-2 py-1 font-mono text-xs">
                                        <input type="checkbox" class="size-3.5 accent-primary" checked={remove.includes(a.id)} disabled={off} onchange={() => (remove = toggle(remove, a.id))} />
                                        {allocationText(a)}
                                    </label>
                                {/each}
                            </div>
                        </div>
                    {/if}
                    {#if canUpdate}
                        <div class="space-y-1.5">
                            <span class="text-sm font-medium">添加分配</span>
                            <Input bind:value={search} placeholder="搜索这个节点上的空闲分配" aria-label="搜索空闲分配" disabled={off} />
                            <div class="max-h-40 overflow-y-auto rounded-md border border-border p-2">
                                {#if !free.data}
                                    <p class="text-xs text-muted-foreground">加载中…</p>
                                {:else if !free.data.length}
                                    <p class="text-xs text-muted-foreground">没有空闲分配。</p>
                                {:else}
                                    <div class="flex flex-wrap gap-2">
                                        {#each free.data as a (a.id)}
                                            <label class="flex items-center gap-1.5 rounded border border-border px-2 py-1 font-mono text-xs">
                                                <input type="checkbox" class="size-3.5 accent-primary" checked={add.includes(a.id)} disabled={off} onchange={() => (add = toggle(add, a.id))} />
                                                {allocationText(a)}
                                            </label>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </CardContent>
            </Card>
        </div>

        <div class="flex flex-col gap-4">
            <LimitFields bind:values={limits} errors={lErrors} disabled={off} />
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Layers class="size-4" />节点</CardTitle></CardHeader>
                <CardContent class="text-sm">
                    {#if server.node}
                        <Link href="/admin/nodes/{server.node.id}" class="text-primary hover:underline">{server.node.name}</Link>
                        <span class="ml-2 font-mono text-xs text-muted-foreground">{server.node.scheme}://{server.node.fqdn}</span>
                        <p class="mt-1 text-xs text-muted-foreground">要换节点，请到“管理”标签页发起迁移。</p>
                    {:else}
                        #{server.nodeId}
                    {/if}
                </CardContent>
            </Card>
        </div>
    </div>

    <div class="flex flex-wrap justify-between gap-2">
        <div>
            {#if app.can('servers.delete')}
                <Button
                    type="button"
                    variant="destructive"
                    onclick={() => {
                        force = false;
                        deleteOpen = true;
                    }}
                >
                    <Trash2 />删除服务器
                </Button>
            {/if}
        </div>
        {#if canUpdate}<Button type="submit" loading={saving} disabled={!valid}>保存</Button>{/if}
    </div>
</form>
