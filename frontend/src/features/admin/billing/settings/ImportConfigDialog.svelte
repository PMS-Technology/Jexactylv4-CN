<script lang="ts">
    import { importBillingConfig } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Switch from '$lib/ui/Switch.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Ported from config/ImportConfigButton.tsx. The legacy dialog closed on failure and
     * reported a JSON parse error as an HTTP error; here the dialog stays open with the
     * message, and the file is parsed before anything is sent.
     */
    let { open = $bindable(false), onImported }: { open?: boolean; onImported: () => void } = $props();

    let file = $state<File | null>(null);
    let override = $state(false);
    let ignoreDuplicates = $state(true);
    let busy = $state(false);
    let error = $state('');

    $effect(() => {
        if (open) {
            file = null;
            override = false;
            ignoreDuplicates = true;
            error = '';
        }
    });

    async function submit() {
        if (!file || busy) return;

        busy = true;
        error = '';
        try {
            let data: unknown;
            try {
                data = JSON.parse(await file.text());
            } catch {
                throw new Error('所选文件不是有效的 JSON。');
            }
            if (!data || typeof data !== 'object') throw new Error('所选文件不是有效的计费配置。');

            await importBillingConfig(data, override, ignoreDuplicates);
            open = false;
            onImported();
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            busy = false;
        }
    }
</script>

<Dialog bind:open title="导入计费配置" preventClose={busy}>
    <div class="space-y-4 text-sm">
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}
        {#if override}
            <Alert variant="warning">覆盖后现有分类和商品无法恢复，建议先导出当前配置。</Alert>
        {/if}
        <input
            type="file"
            accept=".json,application/json"
            aria-label="选择 JSON 文件"
            disabled={busy}
            onchange={e => (file = e.currentTarget.files?.[0] ?? null)}
            class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
            <span>
                <span class="font-medium">删除现有分类和商品</span>
                <span class="block text-xs text-muted-foreground">导入前清空当前出售的所有商品。</span>
            </span>
            <Switch bind:checked={override} aria-label="删除现有分类和商品" disabled={busy} />
        </label>
        {#if !override}
            <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
                <span>
                    <span class="font-medium">跳过重名项</span>
                    <span class="block text-xs text-muted-foreground">名称与现有分类或商品相同的条目不导入。</span>
                </span>
                <Switch bind:checked={ignoreDuplicates} aria-label="跳过重名项" disabled={busy} />
            </label>
        {/if}
    </div>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={busy} onclick={() => (open = false)}>取消</Button>
        <Button size="sm" variant={override ? 'destructive' : 'default'} loading={busy} disabled={!file} onclick={submit}>导入</Button>
    {/snippet}
</Dialog>
