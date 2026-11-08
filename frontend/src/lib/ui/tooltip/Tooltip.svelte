<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Tooltip as TooltipPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

    type Side = 'top' | 'right' | 'bottom' | 'left';

    type Props = {
        content: string;
        /** Preferred side of the trigger the tip renders on. */
        side?: Side;
        /** Hover delay before the tip opens, in milliseconds. */
        delayDuration?: number;
        class?: string;
        /** The tip text, when it needs markup rather than a plain string. */
        contentSnippet?: Snippet;
        /** The trigger element; receives the tooltip's props to spread on it. */
        child?: Snippet<[{ props: Record<string, unknown> }]>;
    };

    let {
        content,
        side = 'top',
        delayDuration = 200,
        class: className,
        contentSnippet,
        child,
    }: Props = $props();
</script>

<TooltipPrimitive.Provider>
    <TooltipPrimitive.Root {delayDuration}>
        <TooltipPrimitive.Trigger {child} />
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                {side}
                sideOffset={8}
                class={cn(
                    'z-[10000] max-w-64 rounded-md border border-border bg-popover px-2.5 py-1.5',
                    'text-xs text-popover-foreground shadow-md select-none',
                    className,
                )}
            >
                {#if contentSnippet}
                    {@render contentSnippet()}
                {:else}
                    {content}
                {/if}
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
</TooltipPrimitive.Provider>
