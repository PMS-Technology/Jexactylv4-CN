<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Popover as PopoverPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils/cn';
    import { animateIn, animateOut } from '$lib/motion';

    type Side = 'top' | 'right' | 'bottom' | 'left';
    type Align = 'start' | 'center' | 'end';

    type Props = {
        open?: boolean;
        /** Preferred side of the trigger the panel renders on. */
        side?: Side;
        /** How the panel lines up with the trigger. */
        align?: Align;
        /** Gap between the trigger and the panel, in pixels. */
        sideOffset?: number;
        /** Called when the panel opens or closes. */
        onOpenChange?: (open: boolean) => void;
        /** Extra classes for the panel. */
        class?: string;
        /** The trigger; receives the popover's props to spread on it. */
        trigger: Snippet<[{ props: Record<string, unknown> }]>;
        /** The panel's content. */
        children?: Snippet;
    };

    let {
        open = $bindable(false),
        side = 'bottom',
        align = 'center',
        sideOffset = 8,
        onOpenChange,
        class: className,
        trigger,
        children,
    }: Props = $props();

    /**
     * The panel fades in and out. It is kept in the document while it fades, because
     * bits-ui removes it as soon as it closes.
     */
    let shown = $state(false);
    let closing = $state(false);
    // bits-ui's `ref` prop has a fallback, so it cannot be bound to an undefined value.
    let panel = $state<HTMLElement | null>(null);
    let token = 0;

    $effect(() => {
        if (!open) return;

        shown = true;
        closing = false;
    });

    // Runs once the panel is open and in the document. Reading the element reference
    // here is what makes the effect wait for it.
    $effect(() => {
        if (!open || !shown || !panel) return;

        // A plain fade: the panel is positioned with an inline transform, which GSAP
        // would overwrite if it animated the position.
        animateIn(panel, { duration: 0.16 });
    });

    $effect(() => {
        if (open || !shown || closing) return;

        closing = true;

        const current = ++token;

        void animateOut(panel, { duration: 0.14 }).then(() => {
            // The panel was reopened while it was closing; leave it alone.
            if (current !== token) return;

            shown = false;
            closing = false;
        });
    });
</script>

<PopoverPrimitive.Root bind:open {onOpenChange}>
    <PopoverPrimitive.Trigger>
        {#snippet child({ props })}
            {@render trigger({ props })}
        {/snippet}
    </PopoverPrimitive.Trigger>

    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            {side}
            {align}
            {sideOffset}
            forceMount
            hidden={!shown}
            bind:ref={panel}
            class={cn(
                'z-[10000] w-64 rounded-lg border border-border bg-popover p-4',
                'text-popover-foreground shadow-lg',
                className,
            )}
        >
            {@render children?.()}
        </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
</PopoverPrimitive.Root>
