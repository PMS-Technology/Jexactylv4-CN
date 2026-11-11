<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Label } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

    /**
     * A form label built on bits-ui's `Label` primitive.
     *
     * `for` points at the control it names. A native `<label for>` only names
     * labelable elements; the bits-ui controls are buttons, so where one of them needs
     * an accessible name it takes it from `aria-labelledby` instead.
     */
    type Props = {
        for?: string;
        /** Id of the label element, so a control can point at it with `aria-labelledby`. */
        id?: string;
        required?: boolean;
        class?: string;
        children?: Snippet;
    };

    let { for: htmlFor, id, required = false, class: className, children }: Props = $props();
</script>

<Label.Root {id} for={htmlFor} class={cn('mb-1.5 block text-sm font-medium', className)}>
    {@render children?.()}
    {#if required}
        <span class="text-destructive" aria-hidden="true">*</span>
    {/if}
</Label.Root>
