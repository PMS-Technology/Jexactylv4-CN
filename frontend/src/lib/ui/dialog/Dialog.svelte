<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Dialog } from 'bits-ui';
    import { cn } from '$lib/utils/cn';
    import { animateIn, animateOut } from '$lib/motion';

    type Props = {
        open?: boolean;
        title: string;
        description?: string;
        /**
         * Blocks Escape and outside clicks, for dialogs that show something the user must
         * not lose (one-time secrets) or that are mid-request.
         */
        preventClose?: boolean;
        onOpenChange?: (open: boolean) => void;
        class?: string;
        children?: Snippet;
        /** Action buttons, rendered right-aligned under the body. */
        footer?: Snippet;
    };

    let {
        open = $bindable(false),
        title,
        description,
        preventClose = false,
        onOpenChange,
        class: className,
        children,
        footer,
    }: Props = $props();

    const behavior = $derived(preventClose ? 'ignore' : 'close');

    /**
     * The dialog is mounted for as long as it is on screen, so it can animate out
     * before it disappears. bits-ui unmounts its content as soon as the dialog closes,
     * and it only waits for a CSS animation it can see through the Web Animations API,
     * which the GSAP tweens are not part of. `forceMount` keeps the element around and
     * `hidden` takes it out of view.
     */
    let shown = $state(false);
    let closing = $state(false);
    /** Bumped after the closing animation, so the content is rebuilt without stale input. */
    let cycle = $state(0);
    // bits-ui's `ref` prop has a fallback, so it cannot be bound to an undefined value.
    let overlay = $state<HTMLElement | null>(null);
    let content = $state<HTMLElement | null>(null);

    /** Invalidates a running animation when the dialog is reopened. */
    let token = 0;

    $effect(() => {
        if (!open) return;

        shown = true;
        closing = false;
    });

    // Runs once the dialog is open and its elements are in the document. Reading the
    // element references here is what makes the effect wait for them.
    $effect(() => {
        if (!open || !shown || !overlay || !content) return;

        const current = ++token;

        animateIn(overlay, { duration: 0.18 });
        animateIn(content, { duration: 0.24, distance: 12 });

        return () => {
            // A newer animation took over; this one must not clean up after it.
            if (current !== token) return;
        };
    });

    $effect(() => {
        if (open || !shown || closing) return;

        closing = true;

        const current = ++token;

        void Promise.all([
            animateOut(overlay, { duration: 0.16 }),
            animateOut(content, { duration: 0.18 }),
        ]).then(() => {
            // The dialog was reopened while it was closing; leave it alone.
            if (current !== token) return;

            shown = false;
            closing = false;
            cycle += 1;
        });
    });
</script>

<Dialog.Root bind:open {onOpenChange}>
    <Dialog.Portal>
        <Dialog.Overlay forceMount bind:ref={overlay} hidden={!shown} class="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content forceMount interactOutsideBehavior={behavior} escapeKeydownBehavior={behavior}>
            {#snippet child({ props })}
                {#key cycle}
                    <div
                        {...props}
                        bind:this={content}
                        hidden={!shown}                        class={cn(
                            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
                            'rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg',
                            className,
                        )}
                    >
                        <Dialog.Title class="font-header text-base font-semibold">{title}</Dialog.Title>
                        {#if description}
                            <Dialog.Description class="mt-1.5 text-sm text-muted-foreground">{description}</Dialog.Description>
                        {/if}

                        {#if children}
                            <div class="mt-4">{@render children()}</div>
                        {/if}

                        {#if footer}
                            <div class="mt-6 flex justify-end gap-2">{@render footer()}</div>
                        {/if}
                    </div>
                {/key}
            {/snippet}
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
