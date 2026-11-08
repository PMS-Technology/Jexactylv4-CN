<script lang="ts">
    import { z } from 'zod';
    import { Form } from '$lib/forms/form.svelte';
    import type { PanelPermissions } from '$lib/api/subusers';
    import type { Subuser } from '$lib/api/definitions/server';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import { Button } from '$lib/ui';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PermissionGroup from './PermissionGroup.svelte';


    /** Permission editor, ported from the edit branch of EditSubuserModal.tsx. */
    type Props = {
        open?: boolean;
        subuser: Subuser;
        permissions: PanelPermissions;
        editablePermissions: string[];
        /** Shows the legacy notice that only the caller's own permissions can be granted. */
        restricted?: boolean;
        onOpenChange?: (open: boolean) => void;
        onSubmit: (data: { email: string; permissions: string[] }) => Promise<void>;
    };

    let { open = false, subuser, permissions, editablePermissions, restricted = false, onOpenChange, onSubmit }: Props = $props();

    const schema = z.object({
        email: z
            .string()
            .email('请输入有效的邮箱地址。')
            .max(191, '邮箱地址不能超过 191 个字符。'),
        permissions: z.array(z.string()),
    });

    const form = new Form({
        schema,
        initial: { email: subuser.email, permissions: subuser.permissions },
        onSubmit: async (values) => {
            await onSubmit(values);
            form.reset();
        },
    });

    $effect(() => {
        if (open) {
            form.values = { email: subuser.email, permissions: subuser.permissions };
        }
    });

    function handleOpenChange(newOpen: boolean) {
        if (!newOpen) {
            form.reset();
        }
        onOpenChange?.(newOpen);
    }

    function handleSubmit() {
        const e = new Event('submit', { bubbles: true });
        form.submit(e as SubmitEvent);
    }
</script>

<Dialog
    {open}
    title="修改 {subuser.email} 的权限"
    onOpenChange={handleOpenChange}
    class="max-w-2xl"
>
    <form onsubmit={(e) => form.submit(e)} class="space-y-6">
        {#if form.errors._}
            <Alert variant="destructive" title="错误">
                {form.errors._}
            </Alert>
        {/if}

        <div>
            <Label for="email">用户邮箱</Label>
            <div class="mt-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {form.values.email}
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
                子用户的邮箱地址无法修改。
            </p>
        </div>

        <div class="space-y-4">
            <PermissionGroup
                {permissions}
                {editablePermissions}
                bind:selectedPermissions={form.values.permissions}
                disabled={form.submitting}
            />

            {#if restricted}
                <Alert variant="info" title="权限限制">
                    只有您当前拥有的权限才能分配给其他用户。
                </Alert>
            {/if}
        </div>

        <div class="flex justify-end gap-2 pt-4">
            <Button
                variant="outline"
                onclick={() => handleOpenChange(false)}
                disabled={form.submitting}
            >
                取消
            </Button>
            <Button
                onclick={handleSubmit}
                disabled={form.submitting}
            >
                {form.submitting ? '保存中...' : '保存权限'}
            </Button>
        </div>
    </form>
</Dialog>
