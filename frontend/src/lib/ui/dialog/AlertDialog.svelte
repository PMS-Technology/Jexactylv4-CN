<script lang="ts">
    import type { Snippet } from 'svelte';
    import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils/cn';
    import { animateIn, animateOut } from '$lib/motion';

    /**
     * A confirmation for an action that cannot be undone.
     *
     * The alert dialog is the strict one: it traps focus, has no dismiss button and
     * does not close when the page behind it is clicked, so the two answers are the
     * only way out. `AlertDialog.Action` does not close the dialog on its own, which
     * is what lets the caller keep it open while a request is in flight.
     *
     * The content is kept in the document while it fades, because bits-ui removes it
     * as soon as the dialog closes.
     */
    type Props = {
        open?: boolean;
        title: string;
        description?: string;
        /** Label of the confirming button. */
        confirmLabel?: string;
        /** Label of the dismissing button. */
        cancelLabel?: string;
        /** Shows the confirming button in the destructive style. */
        destructive?: boolean;
        /** Whether the confirming button is disabled, e.g. while a request runs. */
        disabled?: boolean;
        /** Blocks Escape and outside clicks, for a dialog that must not be lost. */
        preventClose?: boolean;
        /** Called when the confirming button is pressed. */
        onConfirm?: () => void | Promise<void>;
        /** Called when the dialog opens or closes. */
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
        confirmLabel = '确认',
        cancelLabel = '取消',
        destructive = false,
        disabled = false,
        preventClose = false,
        onConfirm,
        onOpenChange,
        class: className,
        children,
        footer,
    }: Props = $props();

    const behavior = $derived(preventClose ? 'ignore' : 'close');

    let shown = $state(false);
    let closing = $state(false);
    /** Bumped after the closing animation, so the content is rebuilt without stale state. */
    let cycle = $state(0);
    // bits-ui's `ref` prop has a fallback, so it cannot be bound to an undefined value.
    let overlay = $state<HTMLElement | null>(null);
    let content = $state<HTMLElement | null>(null);

    let busy = $state(false);

    /** Invalidates a running animation when the dialog is reopened. */
    let token = 0;

    async function confirm() {
        if (busy) return;

        busy = true;
        try {
            await onConfirm?.();
        } finally {
            busy = false;
        }
    }

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

<AlertDialogPrimitive.Root bind:open {onOpenChange}>
    <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
            forceMount
            bind:ref={overlay}
            hidden={!shown}
            class="fixed inset-0 z-50 bg-black/60"
        />
        <AlertDialogPrimitive.Content
            forceMount
            interactOutsideBehavior={behavior}
            escapeKeydownBehavior={behavior}
        >
            {#snippet child({ props })}
                {#key cycle}
                    <div
                        {...props}
                        bind:this={content}
                        hidden={!shown}
                        class={cn(
                            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
                            'rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg',
                            className,
                        )}
                    >
                        <AlertDialogPrimitive.Title class="font-header text-base font-semibold">
                            {title}
                        </AlertDialogPrimitive.Title>
                        {#if description}
                            <AlertDialogPrimitive.Description class="mt-1.5 text-sm text-muted-foreground">
                                {description}
                            </AlertDialogPrimitive.Description>
                        {/if}

                        {#if children}
                            <div class="mt-4">{@render children()}</div>
                        {/if}

                        <div class="mt-6 flex justify-end gap-2">
                            {#if footer}
                                {@render footer()}
                            {:else}
                                <AlertDialogPrimitive.Cancel
                                    disabled={busy}
                                    class={cn(
                                        'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium',
                                        'transition-colors hover:bg-accent hover:text-accent-foreground',
                                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        'disabled:pointer-events-none disabled:opacity-50',
                                    )}
                                >
                                    {cancelLabel}
                                </AlertDialogPrimitive.Cancel>
                                <AlertDialogPrimitive.Action
                                    disabled={busy || disabled}
                                    onclick={confirm}
                                    class={cn(
                                        'inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium',
                                        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        'disabled:pointer-events-none disabled:opacity-50',
                                        destructive
                                            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                            : 'bg-primary text-primary-foreground hover:bg-primary/90',
                                    )}
                                >
                                    {confirmLabel}
                                </AlertDialogPrimitive.Action>
                            {/if}
                        </div>
                    </div>
                {/key}
            {/snippet}
        </AlertDialogPrimitive.Content>
    </AlertDialogPrimitive.Portal>
</AlertDialogPrimitive.Root>
