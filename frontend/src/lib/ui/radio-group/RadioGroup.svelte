<script lang="ts">
    import { RadioGroup } from 'bits-ui';
    import { cn } from '$lib/utils/cn';
    import type { SelectOption } from '$lib/ui/select/types';

    /**
     * A radio group built on bits-ui's `RadioGroup` primitives.
     *
     * The primitive renders each option as a button with `role="radio"`, so the round
     * mark is styled here and the ticked state comes from `data-state`.
     *
     * A `<button>` is a labelable element, so the browser forwards a click on the
     * wrapping label to the option by itself; the text does not need its own handler.
     *
     * The primitive uses an empty string to mean "nothing selected", so an option whose
     * value is the empty string cannot be selected; give such an option a different
     * value.
     */
    type Props = {
        /** The options to choose from. */
        items: readonly SelectOption[];
        /** The selected option's value. */
        value?: string;
        disabled?: boolean;
        /** Name of the hidden input, for form submission. */
        name?: string;
        /** Accessible name of the group. */
        'aria-label'?: string;
        /** Id of the element naming the group. */
        'aria-labelledby'?: string;
        /** How the options are laid out. */
        orientation?: 'vertical' | 'horizontal';
        /**
         * The layout the group applies itself. `none` leaves the layout to the
         * caller's `class`, for a group whose options are laid out as cards.
         */
        layout?: 'stack' | 'row' | 'none';
        /** Extra classes for the group. */
        class?: string;
        /** Extra classes for each option. */
        itemClass?: string;
        /** Called when the selection changes. */
        onValueChange?: (value: string) => void;
    };

    let {
        items,
        value = $bindable(''),
        disabled = false,
        name,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        orientation = 'vertical',
        layout = orientation === 'vertical' ? 'stack' : 'row',
        class: className,
        itemClass,
        onValueChange,
    }: Props = $props();
</script>

<RadioGroup.Root
    bind:value
    {disabled}
    {name}
    {orientation}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    onValueChange={v => onValueChange?.(v)}
    class={cn(
        layout === 'stack' && 'flex flex-col gap-3',
        layout === 'row' && 'flex flex-row flex-wrap gap-3',
        className,
    )}
>
    {#each items as item (item.value)}
        {@const optionDisabled = item.disabled ?? disabled}
        <label
            class={cn('flex items-center gap-2', optionDisabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
            <RadioGroup.Item
                value={item.value}
                disabled={optionDisabled}
                aria-label={item.label}
                class={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-input bg-background',
                    'transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    'data-[state=checked]:border-primary',
                    itemClass,
                )}
            >
                {#snippet children({ checked })}
                    {#if checked}
                        <span class="size-2 rounded-full bg-primary" aria-hidden="true"></span>
                    {/if}
                {/snippet}
            </RadioGroup.Item>
            <span class="text-sm">{item.label}</span>
        </label>
    {/each}
</RadioGroup.Root>
