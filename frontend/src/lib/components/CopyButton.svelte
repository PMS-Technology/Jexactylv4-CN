<script lang="ts">
    import { Check, Copy } from '@lucide/svelte';
    import { cn } from '$lib/utils/cn';

    type Props = { text: string; label?: string; class?: string };

    let { text, label = '复制', class: className }: Props = $props();

    let copied = $state(false);
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            // Clipboard access needs a secure context; the value is still selectable on screen.
            return;
        }

        copied = true;
        clearTimeout(timer);
        timer = setTimeout(() => (copied = false), 2000);
    }
</script>

<button
    type="button"
    class={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
        className,
    )}
    onclick={copy}
>
    {#if copied}
        <Check class="size-3.5 text-success" />
        <span>已复制</span>
    {:else}
        <Copy class="size-3.5" />
        <span>{label}</span>
    {/if}
</button>
