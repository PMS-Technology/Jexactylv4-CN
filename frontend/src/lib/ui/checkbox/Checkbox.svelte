<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Checkbox, Label } from 'bits-ui';
    import { Check, Minus } from '@lucide/svelte';
    import { cn } from '$lib/utils/cn';

    /**
     * A checkbox built on bits-ui's `Checkbox` primitive.
     *
     * The primitive renders a button with `role="checkbox"` rather than an
     * `<input type="checkbox">`, so the box is styled here and the state comes from
     * `checked`/`indeterminate` rather than from the DOM.
     *
     * A `<button>` is a labelable element, so the browser forwards a click on the
     * wrapping label to the box by itself; the text does not need its own handler.
     */
    type Props = {
        /** Whether the box is ticked. */
        checked?: boolean;
        /** Whether the box shows the half-ticked state. */
        indeterminate?: boolean;
        disabled?: boolean;
        /** Id of the box, so a `<label for>` can point at it. */
        id?: string;
        /** Name of the hidden input, for form submission. */
        name?: string;
        /** Text shown next to the box; it also names the box. */
        label?: string;
        /** Accessible name, for a box with no visible label. */
        'aria-label'?: string;
        /** Id of the element naming the box. */
        'aria-labelledby'?: string;
        /** Extra classes for the box itself. */
        class?: string;
        /** Extra classes for the wrapper around the box and its label. */
        wrapperClass?: string;
        /** Called when the box is ticked or unticked. */
        onCheckedChange?: (checked: boolean) => void;
        /** Richer label content, for text that carries markup of its own. */
        children?: Snippet<[{ id: string }]>;
    };

    let {
        checked = $bindable(false),
        indeterminate = $bindable(false),
        disabled = false,
        id,
        name,
        label,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        class: className,
        wrapperClass,
        onCheckedChange,
        children,
    }: Props = $props();

    const uid = $props.id();

    const hasLabel = $derived(Boolean(label || children));
</script>

{#snippet control()}
    <Checkbox.Root
        {id}
        {name}
        {disabled}
        bind:checked
        bind:indeterminate
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (hasLabel ? `${uid}-label` : undefined)}
        onCheckedChange={v => onCheckedChange?.(v)}
        class={cn(
            'inline-flex size-4 shrink-0 items-center justify-center rounded border border-input bg-background',
            'transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
            'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary',
            className,
        )}
    >
        {#snippet children({ checked: isChecked, indeterminate: isIndeterminate })}
            {#if isIndeterminate}
                <Minus class="size-3 text-primary-foreground" strokeWidth={3} aria-hidden="true" />
            {:else if isChecked}
                <Check class="size-3 text-primary-foreground" strokeWidth={3} aria-hidden="true" />
            {/if}
        {/snippet}
    </Checkbox.Root>
{/snippet}

{#if hasLabel}
    <Label.Root
        id={`${uid}-label`}
        class={cn('flex items-center gap-2', disabled ? 'cursor-not-allowed' : 'cursor-pointer', wrapperClass)}
    >
        {@render control()}
        {#if children}
            {@render children({ id: `${uid}-label` })}
        {:else}
            <span>{label}</span>
        {/if}
    </Label.Root>
{:else}
    {@render control()}
{/if}
