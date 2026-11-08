<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { AdminRole, RoleValues } from '$lib/api/admin/users';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Role name, description and colour. AdminRole::$validationRules allows names up to 64
     * characters; the legacy dialog stopped at 32. The legacy colour input always held a
     * colour (black when empty), so "no colour" could not be kept; it is optional here.
     */
    type Props = {
        id: string;
        role?: AdminRole | null;
        disabled?: boolean;
        submitLabel: string;
        onSubmit: (values: RoleValues) => Promise<void>;
        actions?: Snippet;
    };
    let { id, role = null, disabled = false, submitLabel, onSubmit, actions }: Props = $props();

    let name = $state(role?.name ?? '');
    let description = $state(role?.description ?? '');
    let color = $state(role?.color ?? '');
    let saving = $state(false);
    let error = $state('');

    const errors = $derived({
        name: !name.trim() || name.trim().length > 64 ? '名称需要 1–64 个字符。' : undefined,
        description: description.trim().length > 255 ? '描述不能超过 255 个字符。' : undefined,
    });
    const valid = $derived(!errors.name && !errors.description);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            await onSubmit({ name: name.trim(), description: description.trim() || null, color: color || null });
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<form {id} class="space-y-4 text-sm" onsubmit={submit}>
    {#if error}<Alert variant="destructive">{error}</Alert>{/if}
    <div class="space-y-1.5">
        <Label for="{id}-name">名称</Label>
        <Input id="{id}-name" bind:value={name} placeholder="客服" disabled={disabled || saving} error={name ? errors.name : undefined} />
    </div>
    <div class="space-y-1.5">
        <Label for="{id}-description">描述</Label>
        <Input id="{id}-description" bind:value={description} placeholder="可以查看用户和服务器，处理工单" disabled={disabled || saving} error={errors.description} />
    </div>
    <div class="space-y-1.5">
        <Label for="{id}-color">颜色</Label>
        <div class="flex items-center gap-2">
            <input
                id="{id}-color"
                type="color"
                value={color || '#64748b'}
                oninput={e => (color = e.currentTarget.value)}
                disabled={disabled || saving}
                class="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1 disabled:opacity-50"
            />
            <code class="font-mono text-xs text-muted-foreground">{color || '未设置'}</code>
            {#if color && !disabled}
                <Button type="button" variant="ghost" size="sm" onclick={() => (color = '')}>清除</Button>
            {/if}
        </div>
        <p class="text-xs text-muted-foreground">在用户列表和后台里标识这个角色，可选。</p>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <div>{@render actions?.()}</div>
        {#if !disabled}
            <Button type="submit" loading={saving} disabled={!valid}>{submitLabel}</Button>
        {/if}
    </div>
</form>
