<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft, Download, Info, ScrollText, SlidersHorizontal, Trash2 } from '@lucide/svelte';
    import { adminNestKeys, deleteEgg, exportEgg, getEgg, updateEgg } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import EggForm from './EggForm.svelte';
    import InstallTab from './InstallTab.svelte';
    import VariablesTab from './VariablesTab.svelte';

    /**
     * One egg, ported from eggs/EggRouter.tsx, EggDeleteButton.tsx and EggExportButton.tsx.
     * Differences: export downloads the file (the legacy "Save" button did nothing); a
     * deleted egg returns to its nest instead of the nest list; an egg in use cannot be
     * deleted and says so (it used to fail with a database error).
     */
    let { nestId, id, tab }: { nestId: number; id: number; tab: string } = $props();

    const queryClient = useQueryClient();
    const egg = createQuery(() => ({ queryKey: adminNestKeys.egg(id), queryFn: () => getEgg(id) }));

    const tabs = [
        { path: '', name: '设置', icon: Info },
        { path: 'variables', name: '变量', icon: SlidersHorizontal },
        { path: 'install', name: '安装脚本', icon: ScrollText },
    ];

    let deleteOpen = $state(false);
    const remove = async () => {
        await deleteEgg(id);
        queryClient.removeQueries({ queryKey: adminNestKeys.egg(id) });
        await queryClient.invalidateQueries({ queryKey: adminNestKeys.eggs(nestId) });
        navigate(`/admin/nests/${nestId}`);
    };

    let exporting = $state(false);
    let exportError = $state('');
    async function download(name: string) {
        exporting = true;
        exportError = '';
        try {
            const json = await exportEgg(id);
            const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `egg-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            exportError = httpErrorToHuman(e);
        } finally {
            exporting = false;
        }
    }
</script>

{#if egg.error && (egg.error as { response?: { status?: number } }).response?.status === 404}
    <NotFound backTo="/admin/nests/{nestId}" />
{:else if egg.error}
    <Alert variant="destructive">{httpErrorToHuman(egg.error)}</Alert>
{:else if !egg.data}
    <Spinner centered />
{:else}
    {@const e = egg.data}
    <ConfirmDialog bind:open={deleteOpen} title="删除 Egg" confirmLabel="删除" onConfirm={remove}>
        确定删除 <strong>{e.name}</strong> 吗？它的变量会一起删除。还有服务器在用这个 Egg 时不能删除。
    </ConfirmDialog>

    <div class="mb-4 flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1">
            <h1 class="truncate font-header text-xl font-semibold">{e.name}</h1>
            <p class="truncate text-sm text-muted-foreground">
                {#if e.nest}<Link href="/admin/nests/{e.nest.id}" class="hover:underline">{e.nest.name}</Link> · {/if}<span class="font-mono text-xs">{e.uuid}</span>
            </p>
        </div>
        <Button variant="ghost" href="/admin/nests/{e.nestId}"><ArrowLeft />返回</Button>
        {#if app.can('eggs.export')}<Button variant="outline" loading={exporting} onclick={() => download(e.name)}><Download />导出</Button>{/if}
        {#if app.can('eggs.delete')}<Button variant="destructive" onclick={() => (deleteOpen = true)}><Trash2 />删除</Button>{/if}
    </div>
    {#if exportError}<Alert variant="destructive" class="mb-4">{exportError}</Alert>{/if}

    <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="Egg 分类">
        {#each tabs as t (t.path)}
            {@const Icon = t.icon}
            <Link
                href={t.path ? `/admin/nests/${nestId}/eggs/${id}/${t.path}` : `/admin/nests/${nestId}/eggs/${id}`}
                end
                class="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                activeClass="border-primary! text-foreground font-medium"
            >
                <Icon class="size-4" />{t.name}
            </Link>
        {/each}
    </nav>

    {#if tab === ''}
        <EggForm
            egg={e}
            disabled={!app.can('eggs.update')}
            submitLabel="保存"
            onSubmit={async values => {
                await updateEgg(id, values);
                await queryClient.invalidateQueries({ queryKey: adminNestKeys.egg(id) });
                await queryClient.invalidateQueries({ queryKey: adminNestKeys.eggs(e.nestId) });
            }}
        />
    {:else if tab === 'variables'}
        <VariablesTab egg={e} />
    {:else if tab === 'install'}
        <InstallTab egg={e} />
    {:else}
        <NotFound backTo="/admin/nests/{nestId}/eggs/{id}" />
    {/if}
{/if}
