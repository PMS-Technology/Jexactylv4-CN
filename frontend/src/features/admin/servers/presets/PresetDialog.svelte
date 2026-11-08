<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { getEggs, getNests, type PresetValues, type ServerPreset } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Create/edit a preset, ported from presets/ServerPresetDialog.tsx and NestEggSelect.tsx.
     * The legacy three-step wizard ignored request errors (no catch), started CPU, memory
     * and disk at 0, and its egg select kept the old egg after the nest changed. One form
     * here; the egg list follows the nest.
     */
    type Props = { open?: boolean; preset: ServerPreset | null; onSaved: (values: PresetValues) => Promise<void> };
    let { open = $bindable(false), preset, onSaved }: Props = $props();

    let name = $state('');
    let description = $state('');
    let cpu = $state('');
    let memory = $state('');
    let disk = $state('');
    let nestId = $state('');
    let eggId = $state('');
    let saving = $state(false);
    let error = $state('');

    $effect(() => {
        if (!open) return;
        name = preset?.name ?? '';
        description = preset?.description ?? '';
        cpu = String(preset?.cpu ?? 100);
        memory = String(preset?.memory ?? 1024);
        disk = String(preset?.disk ?? 4096);
        nestId = preset?.nestId ? String(preset.nestId) : '';
        eggId = preset?.eggId ? String(preset.eggId) : '';
        error = '';
    });

    const nests = createQuery(() => ({ queryKey: ['admin', 'nests', 'options'], queryFn: getNests, enabled: open }));
    const eggs = createQuery(() => ({ queryKey: ['admin', 'nests', Number(nestId), 'eggs', 'full'], queryFn: () => getEggs(Number(nestId)), enabled: open && Boolean(nestId) }));
    $effect(() => {
        if (eggs.data && eggId && !eggs.data.some(e => String(e.id) === eggId)) eggId = '';
    });

    const int = (v: string) => /^\d+$/.test(v.trim());
    const errors = $derived({
        name: !name.trim() || name.trim().length > 191 ? '名称需要 1–191 个字符。' : undefined,
        cpu: int(cpu) ? undefined : '请输入不小于 0 的整数。',
        memory: int(memory) ? undefined : '请输入不小于 0 的整数。',
        disk: int(disk) ? undefined : '请输入不小于 0 的整数。',
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            await onSaved({
                name: name.trim(),
                description: description.trim() || null,
                cpu: Number(cpu),
                memory: Number(memory),
                disk: Number(disk),
                nest_id: nestId ? Number(nestId) : null,
                egg_id: eggId ? Number(eggId) : null,
            });
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    const select =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

<Dialog bind:open title={preset ? '编辑预设' : '新建预设'} preventClose={saving} class="sm:max-w-xl">
    <form id="preset-form" class="space-y-4 text-sm" onsubmit={submit}>
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}
        <div class="space-y-1.5">
            <Label for="preset-name">名称</Label>
            <Input id="preset-name" bind:value={name} placeholder="Minecraft 4G" disabled={saving} error={name ? errors.name : undefined} />
            <p class="text-xs text-muted-foreground">用预设创建的服务器会命名为“名称 server”。</p>
        </div>
        <div class="space-y-1.5">
            <Label for="preset-description">描述</Label>
            <Input id="preset-description" bind:value={description} disabled={saving} />
        </div>
        <div class="grid gap-3 sm:grid-cols-3">
            {#each [{ id: 'cpu', label: 'CPU（%）' }, { id: 'memory', label: '内存（MiB）' }, { id: 'disk', label: '磁盘（MiB）' }] as f (f.id)}
                <div class="space-y-1.5">
                    <Label for="preset-{f.id}">{f.label}</Label>
                    {#if f.id === 'cpu'}
                        <Input id="preset-cpu" inputmode="numeric" bind:value={cpu} disabled={saving} error={errors.cpu} />
                    {:else if f.id === 'memory'}
                        <Input id="preset-memory" inputmode="numeric" bind:value={memory} disabled={saving} error={errors.memory} />
                    {:else}
                        <Input id="preset-disk" inputmode="numeric" bind:value={disk} disabled={saving} error={errors.disk} />
                    {/if}
                </div>
            {/each}
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Label for="preset-nest">Nest</Label>
                <select id="preset-nest" class={select} bind:value={nestId} disabled={saving || !nests.data}>
                    <option value="">不指定</option>
                    {#each nests.data ?? [] as n (n.id)}<option value={String(n.id)}>{n.name}</option>{/each}
                </select>
            </div>
            <div class="space-y-1.5">
                <Label for="preset-egg">Egg</Label>
                <select id="preset-egg" class={select} bind:value={eggId} disabled={saving || !nestId || !eggs.data}>
                    <option value="">不指定</option>
                    {#each eggs.data ?? [] as e (e.id)}<option value={String(e.id)}>{e.name}</option>{/each}
                </select>
            </div>
        </div>
        <p class="text-xs text-muted-foreground">不指定 Egg 时，用预设创建的服务器会使用 ID 为 1 的 Egg。</p>
    </form>
    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (open = false)}>取消</Button>
        <Button type="submit" form="preset-form" size="sm" loading={saving} disabled={!valid}>{preset ? '保存' : '创建'}</Button>
    {/snippet}
</Dialog>
