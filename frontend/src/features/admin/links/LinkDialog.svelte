<script lang="ts">
    import { createLink, updateLink, type AdminLink } from '$lib/api/admin/appearance';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Create/edit dialog, ported from CreateLinkDialog.tsx. The legacy dialog swallowed
     * request errors (the promise had no catch), so a validation failure just did nothing;
     * errors are shown here and the dialog stays open.
     */
    type Props = { open?: boolean; link: AdminLink | null; onSaved: () => Promise<unknown> };
    let { open = $bindable(false), link, onSaved }: Props = $props();

    let name = $state('');
    let url = $state('');
    let visible = $state(false);
    let saving = $state(false);
    let error = $state('');

    // Reset the fields each time the dialog opens, for the link being edited.
    $effect(() => {
        if (!open) return;
        name = link?.name ?? '';
        url = link?.url ?? '';
        visible = link?.visible ?? false;
        error = '';
    });

    // CustomLink::$validationRules: name min 3, url must be a URL.
    const valid = $derived(name.trim().length >= 3 && /^https?:\/\/\S+$/i.test(url.trim()));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        const values = { name: name.trim(), url: url.trim(), visible };
        try {
            if (link) await updateLink(link.id, values);
            else await createLink(values);
            await onSaved();
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<Dialog bind:open title={link ? '编辑链接' : '新建链接'} preventClose={saving}>
    <form id="link-form" class="space-y-4" onsubmit={submit}>
        {#if error}
            <Alert variant="destructive">{error}</Alert>
        {/if}
        <div class="space-y-1.5">
            <Label for="link-name">链接名称</Label>
            <Input id="link-name" bind:value={name} disabled={saving} minlength={3} />
            <p class="text-xs text-muted-foreground">用户看到的名称，至少 3 个字符。</p>
        </div>
        <div class="space-y-1.5">
            <Label for="link-url">链接地址</Label>
            <Input id="link-url" type="url" bind:value={url} disabled={saving} placeholder="https://…" />
            <p class="text-xs text-muted-foreground">链接指向的面板外部地址。</p>
        </div>
        <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3 text-sm">
            <span>
                <span class="font-medium">对用户可见</span>
                <span class="block text-xs text-muted-foreground">开启后用户可以在侧边栏看到并使用此链接，随时可以关闭。</span>
            </span>
            <Switch bind:checked={visible} aria-label="对用户可见" disabled={saving} />
        </label>
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (open = false)}>取消</Button>
        <Button type="submit" form="link-form" size="sm" loading={saving} disabled={!valid}>{link ? '保存' : '创建'}</Button>
    {/snippet}
</Dialog>
