<script lang="ts">
    import { z } from 'zod';
    import { Form } from '$lib/forms/form.svelte';
    import type { PanelPermissions } from '$lib/api/subusers';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PermissionGroup from './PermissionGroup.svelte';


    /** Invite dialog, ported from the create branch of EditSubuserModal.tsx. */
    type Props = {
        open?: boolean;
        permissions: PanelPermissions;
        editablePermissions: string[];
        /** Shows the legacy notice that only the caller's own permissions can be granted. */
        restricted?: boolean;
        onOpenChange?: (open: boolean) => void;
        onSubmit: (data: { email: string; permissions: string[] }) => Promise<void>;
    };

    let { open = false, permissions, editablePermissions, restricted = false, onOpenChange, onSubmit }: Props = $props();

    const schema = z.object({
        email: z
            .string()
            .email('请输入有效的邮箱地址。')
            .max(191, '邮箱地址不能超过 191 个字符。'),
        permissions: z.array(z.string()),
    });

    const form = new Form({
        schema,
        initial: { email: '', permissions: [] },
        onSubmit: async (values) => {
            await onSubmit(values);
            form.reset();
        },
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
    title="添加子用户"
    description="邀请新用户作为此服务器的子用户。"
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
            <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                bind:value={form.values.email}
                disabled={form.submitting}
                class="mt-1"
            />
            {#if form.errors.email}
                <p class="mt-1 text-sm text-destructive">{form.errors.email}</p>
            {/if}
            <p class="mt-1 text-xs text-muted-foreground">
                输入您想邀请为此服务器子用户的用户的邮箱地址。
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
                {form.submitting ? '邀请中...' : '邀请用户'}
            </Button>
        </div>
    </form>
</Dialog>
