<script lang="ts">
    import type { Nest, NestValues } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Create/edit a nest, ported from NewNestButton.tsx and the edit box in
     * NestEditContainer.tsx. The legacy create form asked for an author email that the
     * backend then replaced with the panel's default author; it is kept now. The author
     * cannot change after creation.
     */
    type Props = { open?: boolean; nest: Nest | null; onSaved: (values: NestValues) => Promise<void> };
    let { open = $bindable(false), nest, onSaved }: Props = $props();

    let name = $state('');
    let description = $state('');
    let author = $state('');
    let saving = $state(false);
    let error = $state('');

    $effect(() => {
        if (!open) return;
        name = nest?.name ?? '';
        description = nest?.description ?? '';
        author = nest?.author ?? app.user?.email ?? '';
        error = '';
    });

    const errors = $derived({
        name: !name.trim() || name.trim().length > 191 ? '名称需要 1–191 个字符。' : undefined,
        author: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.trim()) ? undefined : '请输入邮箱地址。',
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            await onSaved({ name: name.trim(), description: description.trim() || null, author: author.trim() });
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<Dialog bind:open title={nest ? '编辑 Nest' : '新建 Nest'} preventClose={saving}>
    <form id="nest-form" class="space-y-4 text-sm" onsubmit={submit}>
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}
        <div class="space-y-1.5">
            <Label for="nest-name">名称</Label>
            <Input id="nest-name" bind:value={name} disabled={saving} error={name ? errors.name : undefined} />
        </div>
        <div class="space-y-1.5">
            <Label for="nest-description">描述</Label>
            <Input id="nest-description" bind:value={description} disabled={saving} />
        </div>
        <div class="space-y-1.5">
            <Label for="nest-author">作者邮箱</Label>
            <Input id="nest-author" type="email" bind:value={author} disabled={saving || Boolean(nest)} error={author ? errors.author : undefined} />
            {#if nest}<p class="text-xs text-muted-foreground">作者在创建后不能修改。</p>{/if}
        </div>
    </form>
    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (open = false)}>取消</Button>
        <Button type="submit" form="nest-form" size="sm" loading={saving} disabled={!valid}>{nest ? '保存' : '创建'}</Button>
    {/snippet}
</Dialog>
