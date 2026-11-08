<script lang="ts">
    import type { EggVariableValues } from '$lib/api/admin/nests';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Textarea from '$lib/ui/Textarea.svelte';

    /** The fields of one egg variable, ported from EggVariableForm in EggVariablesContainer.tsx. */
    type Props = { values: EggVariableValues; errors: Partial<Record<'name' | 'env_variable' | 'rules', string>>; prefix: string; disabled?: boolean };
    let { values = $bindable(), errors, prefix, disabled = false }: Props = $props();
</script>

<div class="space-y-3 text-sm">
    <div class="space-y-1.5">
        <Label for="{prefix}-name">名称</Label>
        <Input id="{prefix}-name" bind:value={values.name} {disabled} error={errors.name} />
    </div>
    <div class="space-y-1.5">
        <Label for="{prefix}-description">描述</Label>
        <Textarea id="{prefix}-description" bind:value={values.description} rows={2} {disabled} />
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
            <Label for="{prefix}-env">环境变量</Label>
            <Input id="{prefix}-env" bind:value={values.env_variable} class="font-mono text-xs" {disabled} error={errors.env_variable} />
        </div>
        <div class="space-y-1.5">
            <Label for="{prefix}-default">默认值</Label>
            <Input id="{prefix}-default" bind:value={values.default_value} class="font-mono text-xs" {disabled} />
        </div>
    </div>
    <div class="flex flex-wrap gap-4">
        <label class="flex items-center gap-2"><input type="checkbox" class="size-4 accent-primary" bind:checked={values.user_viewable} {disabled} />用户可见</label>
        <label class="flex items-center gap-2"><input type="checkbox" class="size-4 accent-primary" bind:checked={values.user_editable} {disabled} />用户可修改</label>
    </div>
    <div class="space-y-1.5">
        <Label for="{prefix}-rules">验证规则</Label>
        <Input id="{prefix}-rules" bind:value={values.rules} class="font-mono text-xs" placeholder="required|string|max:20" {disabled} error={errors.rules} />
        <p class="text-xs text-muted-foreground">Laravel 验证规则，用户修改变量值时检查。</p>
    </div>
</div>
