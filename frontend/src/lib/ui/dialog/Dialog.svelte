<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Dialog } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

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
</script>

<Dialog.Root bind:open {onOpenChange}>
    <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
            class={cn(
                'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
                'rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg',
                className,
            )}
            interactOutsideBehavior={behavior}
            escapeKeydownBehavior={behavior}
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
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
