<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { Cog, Network } from '@lucide/svelte';
    import type { UserSummary } from '$lib/api/admin/modules';
    import { getNodes } from '$lib/api/admin/nodes';
    import { adminServerKeys, allocationText, createServer, getFreeAllocations, type EggOption } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import UserPicker from '../tickets/UserPicker.svelte';
    import LimitFields from './LimitFields.svelte';
    import ServiceFields from './ServiceFields.svelte';
    import { defaultLimits, limitErrors, toLimitPayload, variableErrors } from './limits';

    /**
     * New server, ported from NewServerContainer.tsx, NodeSelect.tsx and OwnerSelect.tsx.
     * The legacy form had no validation schema, posted `externalId` (ignored by the
     * backend) and sent `start_on_completion` that StoreServerRequest did not accept, so
     * new servers never started after installing. Both now reach the backend.
     */
    const queryClient = useQueryClient();

    let name = $state('');
    let externalId = $state('');
    let description = $state('');
    let owner = $state<UserSummary | null>(null);
    let nodeId = $state<number | null>(null);
    let allocationId = $state('');
    let allocationSearch = $state('');
    let startOnCompletion = $state(true);
    let skipScripts = $state(false);
    let limits = $state(defaultLimits());

    let nestId = $state<number | null>(null);
    let eggId = $state<number | null>(null);
    let image = $state('');
    let startup = $state('');
    let environment = $state<Record<string, string>>({});
    let egg = $state<EggOption | null>(null);

    const nodes = createQuery(() => ({ queryKey: ['admin', 'nodes', 'options'], queryFn: () => getNodes({ sorts: { name: 'asc' } }, 100).then(r => r.items) }));

    let debouncedSearch = $state('');
    $effect(() => {
        const v = allocationSearch.trim();
        const t = setTimeout(() => (debouncedSearch = v), 250);

        return () => clearTimeout(t);
    });
    const allocations = createQuery(() => ({
        queryKey: ['admin', 'nodes', nodeId, 'allocations', 'free', debouncedSearch],
        queryFn: () => getFreeAllocations(nodeId!, debouncedSearch),
        enabled: nodeId !== null,
    }));
    $effect(() => {
        if (allocations.data && !allocations.data.some(a => String(a.id) === allocationId)) allocationId = allocations.data[0] ? String(allocations.data[0].id) : '';
    });

    const lErrors = $derived(limitErrors(limits));
    const vErrors = $derived(variableErrors(egg, environment));
    const errors = $derived({
        name: !name.trim() || name.trim().length > 191 ? '名称需要 1–191 个字符。' : undefined,
        externalId: externalId.trim().length > 191 ? '不能超过 191 个字符。' : undefined,
        owner: owner ? undefined : '请选择所有者。',
        node: nodeId ? undefined : '请选择节点。',
        allocation: allocationId ? undefined : '请选择一个空闲分配。',
        egg: eggId ? undefined : '请选择 Egg。',
        image: image.trim() ? undefined : '请填写镜像。',
        startup: startup.trim() ? undefined : '请填写启动命令。',
    });
    const valid = $derived(!Object.values(errors).some(Boolean) && !Object.keys(lErrors).length && !Object.keys(vErrors).length);

    let saving = $state(false);
    let error = $state('');

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            const { id } = await createServer({
                external_id: externalId.trim() || null,
                name: name.trim(),
                description: description.trim() || null,
                owner_id: owner!.id,
                node_id: nodeId!,
                ...toLimitPayload(limits),
                allocation: { default: Number(allocationId), additional: [] },
                startup: startup.trim(),
                environment,
                egg_id: eggId!,
                image: image.trim(),
                skip_scripts: skipScripts,
                start_on_completion: startOnCompletion,
            });
            await queryClient.invalidateQueries({ queryKey: adminServerKeys.all });
            navigate(`/admin/servers/${id}`);
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    const select =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

<PageHeader title="新建服务器" description="在一个节点上创建新服务器。" />

<form onsubmit={submit} class="space-y-4">
    {#if error}<Alert variant="destructive">{error}</Alert>{/if}

    <div class="grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Cog class="size-4" />基本信息</CardTitle></CardHeader>
                <CardContent class="space-y-4 text-sm">
                    <div class="space-y-1.5">
                        <Label for="srv-name">名称</Label>
                        <Input id="srv-name" bind:value={name} placeholder="我的服务器" disabled={saving} error={name ? errors.name : undefined} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="srv-description">描述</Label>
                        <Input id="srv-description" bind:value={description} disabled={saving} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="srv-external">外部 ID</Label>
                        <Input id="srv-external" bind:value={externalId} class="font-mono" disabled={saving} error={errors.externalId} />
                        <p class="text-xs text-muted-foreground">可选，供外部系统对接。</p>
                    </div>
                    <UserPicker id="srv-owner" label="所有者" selected={owner} disabled={saving} onSelect={u => (owner = u)} />
                    <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
                        <span><span class="font-medium">安装完成后启动</span><span class="block text-xs text-muted-foreground">安装脚本跑完后自动启动服务器。</span></span>
                        <Switch bind:checked={startOnCompletion} aria-label="安装完成后启动" disabled={saving} />
                    </label>
                    <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
                        <span><span class="font-medium">跳过安装脚本</span><span class="block text-xs text-muted-foreground">不运行 Egg 的安装脚本，适合手动准备文件的情况。</span></span>
                        <Switch bind:checked={skipScripts} aria-label="跳过安装脚本" disabled={saving} />
                    </label>
                </CardContent>
            </Card>
        </div>

        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Network class="size-4" />节点与网络</CardTitle></CardHeader>
                <CardContent class="space-y-4 text-sm">
                    <div class="space-y-1.5">
                        <Label for="srv-node">节点</Label>
                        <select id="srv-node" class={select} disabled={saving || !nodes.data} value={nodeId === null ? '' : String(nodeId)} onchange={e => (nodeId = e.currentTarget.value ? Number(e.currentTarget.value) : null)}>
                            <option value="">选择节点…</option>
                            {#each nodes.data ?? [] as n (n.id)}
                                <option value={String(n.id)}>{n.name}（{n.fqdn}）{n.maintenanceMode ? ' · 维护中' : ''}</option>
                            {/each}
                        </select>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="srv-allocation">主分配</Label>
                        {#if nodeId === null}
                            <p class="text-xs text-muted-foreground">先选择节点。</p>
                        {:else}
                            <Input bind:value={allocationSearch} placeholder="搜索 IP 或端口" aria-label="搜索分配" class="mb-2" disabled={saving} />
                            <select id="srv-allocation" class={select} bind:value={allocationId} disabled={saving || !allocations.data?.length}>
                                {#if allocations.data && !allocations.data.length}<option value="">这个节点没有空闲分配</option>{/if}
                                {#each allocations.data ?? [] as a (a.id)}<option value={String(a.id)}>{allocationText(a)}</option>{/each}
                            </select>
                            {#if allocations.data?.length === 100}<p class="text-xs text-muted-foreground">只显示前 100 个，可以用搜索缩小范围。</p>{/if}
                        {/if}
                    </div>
                </CardContent>
            </Card>
            <LimitFields bind:values={limits} errors={lErrors} disabled={saving} />
        </div>
    </div>

    <ServiceFields bind:nestId bind:eggId bind:image bind:startup bind:environment bind:egg disabled={saving} />

    <div class="flex justify-end">
        <Button type="submit" loading={saving} disabled={!valid}>创建服务器</Button>
    </div>
</form>
