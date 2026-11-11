<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Tooltip as TooltipPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils/cn';
    import { animateIn, animateOut } from '$lib/motion';

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

    /**
     * The tip fades in and out. It is kept in the document while it fades, because
     * bits-ui removes it as soon as it closes.
     */
    let open = $state(false);
    let shown = $state(false);
    // bits-ui's `ref` prop has a fallback, so it cannot be bound to an undefined value.
    let tip = $state<HTMLElement | null>(null);
    let token = 0;

    $effect(() => {
        if (!open) return;

        shown = true;
    });

    // Runs once the tip is open and in the document. Reading the element reference here
    // is what makes the effect wait for it.
    $effect(() => {
        if (!open || !shown || !tip) return;

        // A plain fade: the tip is positioned with an inline transform, which GSAP would
        // overwrite if it animated the position.
        animateIn(tip, { duration: 0.14 });
    });

    $effect(() => {
        if (open || !shown) return;

        const current = ++token;

        void animateOut(tip, { duration: 0.12 }).then(() => {
            if (current !== token) return;

            shown = false;
        });
    });
</script>

<TooltipPrimitive.Provider>
    <TooltipPrimitive.Root {delayDuration} bind:open>
        <TooltipPrimitive.Trigger {child} />
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                {side}
                sideOffset={8}
                forceMount
                hidden={!shown}
                bind:ref={tip}
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
