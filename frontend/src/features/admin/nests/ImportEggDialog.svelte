<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { Upload } from '@lucide/svelte';
    import { adminNestKeys, importEgg } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { navigate } from '$lib/router/router.svelte';
    import { Button } from '$lib/ui';
    import Label from '$lib/ui/Label.svelte';
    import Textarea from '$lib/ui/Textarea.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Import an egg into a nest, ported from ImportEggButton.tsx. The legacy dialog only
     * logged failures to the console and stayed open with no message; errors show here,
     * YAML exports are accepted, and the imported egg opens afterwards.
     */
    let { open = $bindable(false), nestId }: { open?: boolean; nestId: number } = $props();

    const queryClient = useQueryClient();
    let content = $state('');
    let fileName = $state('');
    let busy = $state(false);
    let error = $state('');

    $effect(() => {
        if (!open) return;
        content = '';
        fileName = '';
        error = '';
    });

    async function pick(event: Event) {
        const file = (event.currentTarget as HTMLInputElement).files?.[0];
        if (!file) return;
        fileName = file.name;
        content = await file.text();
    }

    const isYaml = $derived(/\.ya?ml$/i.test(fileName) || (content.trim() !== '' && !/^[{[]/.test(content.trim())));

    async function submit() {
        busy = true;
        error = '';
        try {
            const { id } = await importEgg(nestId, content, isYaml ? 'application/yaml' : 'application/json');
            await queryClient.invalidateQueries({ queryKey: adminNestKeys.eggs(nestId) });
            open = false;
            navigate(`/admin/nests/${nestId}/eggs/${id}`);
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            busy = false;
        }
    }
</script>

<Dialog bind:open title="导入 Egg" preventClose={busy} class="sm:max-w-2xl">
    <div class="space-y-4 text-sm">
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}
        <div class="space-y-1.5">
            <Label for="import-file">文件</Label>
            <input id="import-file" type="file" accept=".json,.yaml,.yml,application/json" class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm" disabled={busy} onchange={pick} />
        </div>
        <div class="space-y-1.5">
            <Label for="import-content">内容</Label>
            <Textarea id="import-content" bind:value={content} rows={12} class="font-mono text-xs" placeholder={'选择文件，或把导出的 JSON / YAML 粘贴到这里'} disabled={busy} />
            <p class="text-xs text-muted-foreground">按{isYaml ? ' YAML ' : ' JSON '}解析。Egg 的变量会一起导入。</p>
        </div>
    </div>
    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={busy} onclick={() => (open = false)}>取消</Button>
        <Button size="sm" loading={busy} disabled={!content.trim()} onclick={submit}><Upload />导入</Button>
    {/snippet}
</Dialog>
