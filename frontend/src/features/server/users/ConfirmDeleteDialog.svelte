<script lang="ts">
    import type { Subuser } from '$lib/api/definitions/server';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import { Button } from '$lib/ui';


    /** Removal confirmation, ported from RemoveSubuserButton.tsx. */
    type Props = {
        open?: boolean;
        subuser: Subuser;
        isLoading?: boolean;
        onOpenChange?: (open: boolean) => void;
        onConfirm: () => Promise<void>;
    };

    let { open = false, subuser, isLoading = false, onOpenChange, onConfirm }: Props = $props();
</script>

<Dialog
    {open}
    title="删除此子用户？"
    description="此操作无法撤销。"
    onOpenChange={onOpenChange}
>
    <div class="space-y-6">
        <p class="text-sm text-muted-foreground">
            您确定要删除 <span class="font-medium">{subuser.email}</span> 吗？他们将立即失去对此服务器的所有访问权限。
        </p>

        <div class="flex justify-end gap-2">
            <Button
                variant="outline"
                onclick={() => onOpenChange?.(false)}
                disabled={isLoading}
            >
                取消
            </Button>
            <Button
                variant="destructive"
                onclick={() => onConfirm()}
                disabled={isLoading}
            >
                {isLoading ? '删除中...' : '删除子用户'}
            </Button>
        </div>
    </div>
</Dialog>
