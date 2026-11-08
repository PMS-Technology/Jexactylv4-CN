<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { format } from 'date-fns';
    import { ArrowLeft, Pencil, Trash2 } from '@lucide/svelte';
    import { adminServerKeys, deletePreset, getEgg, getPreset, updatePreset } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PresetDialog from './PresetDialog.svelte';

    /**
     * One preset, ported from presets/ServerPresetViewContainer.tsx and
     * DeleteServerPresetDialog.tsx. The legacy page showed bare nest/egg IDs and, after an
     * update, navigated back to the list instead of showing the change.
     */
    let { id }: { id: number } = $props();

    const queryClient = useQueryClient();
    const preset = createQuery(() => ({ queryKey: adminServerKeys.preset(id), queryFn: () => getPreset(id) }));
    const egg = createQuery(() => ({
        queryKey: ['admin', 'eggs', preset.data?.eggId ?? 0],
        queryFn: () => getEgg(preset.data!.eggId!),
        enabled: Boolean(preset.data?.eggId),
    }));

    let editOpen = $state(false);
    let deleteOpen = $state(false);

    const remove = async () => {
        await deletePreset(id);
        queryClient.removeQueries({ queryKey: adminServerKeys.preset(id) });
        await queryClient.invalidateQueries({ queryKey: adminServerKeys.presets });
        navigate('/admin/servers/presets');
    };
</script>

{#if preset.error && (preset.error as { response?: { status?: number } }).response?.status === 404}
    <NotFound backTo="/admin/servers/presets" />
{:else if preset.error}
    <Alert variant="destructive">{httpErrorToHuman(preset.error)}</Alert>
{:else if !preset.data}
    <Spinner centered />
{:else}
    {@const p = preset.data}
    <PresetDialog
        bind:open={editOpen}
        preset={p}
        onSaved={async values => {
            const updated = await updatePreset(id, values);
            queryClient.setQueryData(adminServerKeys.preset(id), updated);
            await queryClient.invalidateQueries({ queryKey: [...adminServerKeys.presets, 'list'] });
        }}
    />
    <ConfirmDialog bind:open={deleteOpen} title="删除预设" confirmLabel="删除" onConfirm={remove}>
        确定删除预设 <strong>{p.name}</strong> 吗？已经用它创建的服务器不受影响。
    </ConfirmDialog>

    <div class="mb-6 flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
            <h1 class="truncate font-header text-xl font-semibold">{p.name}</h1>
            <p class="truncate text-sm text-muted-foreground">{p.description ?? '没有描述'}</p>
        </div>
        <Button variant="ghost" href="/admin/servers/presets"><ArrowLeft />返回</Button>
        {#if app.can('server-presets.update')}<Button variant="outline" onclick={() => (editOpen = true)}><Pencil />编辑</Button>{/if}
        {#if app.can('server-presets.delete')}<Button variant="destructive" onclick={() => (deleteOpen = true)}><Trash2 />删除</Button>{/if}
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
        <Card>
            <CardHeader><CardTitle>资源</CardTitle></CardHeader>
            <CardContent class="grid grid-cols-3 gap-3 text-sm">
                <div><p class="text-xs text-muted-foreground">CPU</p><p class="text-lg font-semibold">{p.cpu}%</p></div>
                <div><p class="text-xs text-muted-foreground">内存</p><p class="text-lg font-semibold">{p.memory} MiB</p></div>
                <div><p class="text-xs text-muted-foreground">磁盘</p><p class="text-lg font-semibold">{p.disk} MiB</p></div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Egg</CardTitle></CardHeader>
            <CardContent class="space-y-1 text-sm">
                {#if !p.eggId}
                    <p>未指定，创建时使用 ID 为 1 的 Egg。</p>
                {:else if egg.data}
                    <p>{egg.data.name} <span class="font-mono text-xs text-muted-foreground">#{egg.data.id}</span></p>
                {:else}
                    <p class="font-mono text-xs">#{p.eggId}</p>
                {/if}
                <p class="text-xs text-muted-foreground">创建于 {format(p.createdAt, 'yyyy-MM-dd HH:mm')}</p>
            </CardContent>
        </Card>
    </div>
{/if}
