<script lang="ts">
    import { Button, Dialog } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';

    let { open = $bindable(false), tokens }: { open?: boolean; tokens: string[] } = $props();
</script>

<!-- The codes are shown once, so the dialog only closes through the explicit button. -->
<Dialog
    bind:open
    title="两步验证已启用"
    description="请将下面的恢复代码保存在安全的地方。手机丢失时，可以用它们登录。"
    preventClose
>
    <div class="space-y-3">
        <div class="relative rounded-md bg-muted p-3">
            <ul class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm">
                {#each tokens as token (token)}
                    <li>{token}</li>
                {/each}
            </ul>
            <CopyButton text={tokens.join('\n')} class="absolute right-2 top-2" />
        </div>
        <Alert variant="destructive">这些代码不会再次显示。</Alert>
    </div>

    {#snippet footer()}
        <Button size="sm" onclick={() => (open = false)}>完成</Button>
    {/snippet}
</Dialog>
