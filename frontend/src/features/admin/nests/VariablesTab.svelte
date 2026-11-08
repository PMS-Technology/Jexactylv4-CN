<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { Plus, Trash2 } from '@lucide/svelte';
    import { adminNestKeys, createEggVariable, deleteEggVariable, updateEggVariables, variableValues, type Egg, type EggVariableValues } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import VariableFields from './VariableFields.svelte';
    import { emptyVariable, variableErrors } from './variables';

    /**
     * Egg variables, ported from EggVariablesContainer.tsx and NewVariableButton.tsx.
     * Differences: the legacy delete kept only the deleted variable on screen (inverted
     * filter) until a reload, and new variables were always saved as hidden from and not
     * editable by users (a backend bug, fixed); edits in progress survive adding or
     * deleting another variable.
     */
    let { egg }: { egg: Egg } = $props();

    const queryClient = useQueryClient();
    const canUpdate = $derived(app.can('eggs.update'));

    let rows = $state(egg.variables.map(v => ({ id: v.id, values: variableValues(v) })));
    const rowErrors = $derived(rows.map((r, i) => variableErrors(r.values, rows.filter((_, n) => n !== i).map(o => o.values))));
    const valid = $derived(rowErrors.every(e => !Object.keys(e).length));

    let saving = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    const refresh = () => queryClient.invalidateQueries({ queryKey: adminNestKeys.egg(egg.id) });

    async function save() {
        if (!valid || saving) return;
        saving = true;
        notice = null;
        try {
            const saved = await updateEggVariables(egg.id, rows.map(r => ({ id: r.id, ...r.values })));
            rows = saved.map(v => ({ id: v.id, values: variableValues(v) }));
            await refresh();
            notice = { variant: 'success', text: '变量已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    // --- New variable
    let createOpen = $state(false);
    let draft = $state<EggVariableValues>(emptyVariable());
    let creating = $state(false);
    let createError = $state('');
    const draftErrors = $derived(variableErrors(draft, rows.map(r => r.values)));

    async function create(event: SubmitEvent) {
        event.preventDefault();
        if (Object.keys(draftErrors).length || creating) return;
        creating = true;
        createError = '';
        try {
            const v = await createEggVariable(egg.id, { ...draft, env_variable: draft.env_variable.trim() });
            rows = [...rows, { id: v.id, values: variableValues(v) }];
            await refresh();
            createOpen = false;
        } catch (e) {
            createError = httpErrorToHuman(e);
        } finally {
            creating = false;
        }
    }

    // --- Delete
    let deleting = $state<{ id: number; name: string } | null>(null);
    let deleteOpen = $state(false);
    const remove = async () => {
        const target = deleting!;
        await deleteEggVariable(egg.id, target.id);
        rows = rows.filter(r => r.id !== target.id);
        await refresh();
    };
</script>

<Dialog bind:open={createOpen} title="新建变量" preventClose={creating} class="sm:max-w-xl">
    <form id="variable-form" onsubmit={create} class="space-y-4">
        {#if createError}<Alert variant="destructive">{createError}</Alert>{/if}
        <VariableFields bind:values={draft} errors={draft.name || draft.env_variable ? draftErrors : {}} prefix="new-var" disabled={creating} />
    </form>
    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={creating} onclick={() => (createOpen = false)}>取消</Button>
        <Button type="submit" form="variable-form" size="sm" loading={creating} disabled={Boolean(Object.keys(draftErrors).length)}>创建</Button>
    {/snippet}
</Dialog>

<ConfirmDialog bind:open={deleteOpen} title="删除变量" confirmLabel="删除" onConfirm={remove}>
    确定删除变量 <strong>{deleting?.name}</strong> 吗？所有使用这个 Egg 的服务器都会失去它的值。
</ConfirmDialog>

<div class="space-y-4">
    {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}

    {#if !rows.length}
        <Card><CardContent class="py-12 text-center text-sm text-muted-foreground">这个 Egg 还没有变量。</CardContent></Card>
    {:else}
        <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {#each rows as row (row.id)}
                <Card>
                    <CardHeader class="flex flex-row items-center justify-between gap-2">
                        <CardTitle class="truncate font-mono text-sm">{row.values.env_variable || '未命名'}</CardTitle>
                        {#if app.can('eggs.delete')}
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="删除 {row.values.name}"
                                disabled={saving}
                                onclick={() => ((deleting = { id: row.id, name: egg.variables.find(v => v.id === row.id)?.name ?? row.values.name }), (deleteOpen = true))}
                            >
                                <Trash2 />
                            </Button>
                        {/if}
                    </CardHeader>
                    <CardContent>
                        <VariableFields bind:values={row.values} errors={rowErrors[rows.indexOf(row)] ?? {}} prefix="var-{row.id}" disabled={!canUpdate || saving} />
                    </CardContent>
                </Card>
            {/each}
        </div>
    {/if}

    <div class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        {#if app.can('eggs.create')}
            <Button variant="outline" disabled={saving} onclick={() => ((draft = emptyVariable()), (createError = ''), (createOpen = true))}><Plus />新建变量</Button>
        {/if}
        {#if canUpdate && rows.length}<Button class="ml-auto" loading={saving} disabled={!valid} onclick={save}>保存全部变量</Button>{/if}
    </div>
</div>
