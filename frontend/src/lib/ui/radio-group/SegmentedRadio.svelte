<script lang="ts">
    import { RadioGroup } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

    /**
     * A radio group whose options fill the width of the group as segments, for
     * choices that are made with a click rather than read from a list.
     *
     * The primitive renders each option as a button with `role="radio"`, so the
     * segments are styled here and the ticked state comes from `data-state`.
     *
     * The primitive uses an empty string to mean "nothing selected", so an option whose
     * value is the empty string cannot be selected; give such an option a different
     * value.
     */
    type Option = {
        value: string;
        label: string;
    };

    type Props = {
        /** The options to choose from. */
        items: readonly Option[];
        /** The selected option's value. */
        value?: string;
        disabled?: boolean;
        /** Name of the hidden input, for form submission. */
        name?: string;
        /** Accessible name of the group. */
        'aria-label'?: string;
        /** Id of the element naming the group. */
        'aria-labelledby'?: string;
        /** How many segments the group is split into. */
        columns?: 1 | 2 | 3 | 4;
        /** Extra classes for the group. */
        class?: string;
        /** Extra classes for each segment. */
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
        columns = 2,
        class: className,
        itemClass,
        onValueChange,
    }: Props = $props();
</script>

<RadioGroup.Root
    bind:value
    {disabled}
    {name}
    orientation="horizontal"
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    onValueChange={v => onValueChange?.(v)}
    class={cn(
        'grid overflow-hidden rounded-md border border-input',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        className,
    )}
>
    {#each items as item (item.value)}
        <RadioGroup.Item
            value={item.value}
            disabled={disabled}
            class={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
                itemClass,
            )}
        >
            {item.label}
        </RadioGroup.Item>
    {/each}
</RadioGroup.Root>
