<script lang="ts">
    import { Select } from 'bits-ui';
    import { ChevronDown, Check } from '@lucide/svelte';
    import { cn } from '$lib/utils/cn';
    import Label from '$lib/ui/Label.svelte';
    import type { SelectOption } from './types';

    /**
     * A select built on bits-ui's `Select` primitives.
     *
     * The trigger is a button rather than a native `<select>`, so the list gets
     * typeahead, keyboard navigation and a portalled popup for free. `items` is handed
     * to the primitive as well, which is what makes typeahead work.
     *
     * The label lives inside the component so it can name the trigger. A `<label for>`
     * cannot name a button — only native inputs take their name from it — so the label
     * points at the trigger with `aria-labelledby` as well.
     *
     * The primitive reads an empty value as "nothing selected", so an option whose
     * value is the empty string — a "none" entry — could not be selected. Such an
     * option is given a marker value instead, which is mapped back to the empty string
     * on the way in and out. The label in the trigger is resolved from `items` rather
     * than left to `Select.Value`, for the same reason.
     */
    type Props = {
        /** The options to choose from. */
        items: readonly SelectOption[];
        /** The selected option's value. */
        value?: string;
        /** Visible label, which also names the trigger. */
        label?: string;
        /** Text shown when the value matches no option. */
        placeholder?: string;
        disabled?: boolean;
        /** Accessible name, for a select with no visible label. */
        'aria-label'?: string;
        /** Id of the element naming the trigger, when the label sits outside the component. */
        'aria-labelledby'?: string;
        /** Id of the trigger, so a `<label for>` elsewhere can point at it. */
        id?: string;
        /** Extra classes for the trigger. */
        class?: string;
        /** Extra classes for the listbox. */
        contentClass?: string;
        /** Called when the selection changes. */
        onValueChange?: (value: string) => void;
    };

    let {
        items,
        value = $bindable(''),
        label,
        placeholder,
        disabled = false,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        id,
        class: className,
        contentClass,
        onValueChange,
    }: Props = $props();

    const uid = $props.id();

    /**
     * The marker the empty value is held as inside the primitive. It is picked so it
     * cannot collide with a real option's value.
     */
    const EMPTY = $derived.by(() => {
        let marker = 'empty';
        while (items.some(item => item.value === marker)) marker += '-';
        return marker;
    });

    const hasEmptyOption = $derived(items.some(item => item.value === ''));

    const encode = (v: string) => (v === '' && hasEmptyOption ? EMPTY : v);
    const decode = (v: string) => (v === EMPTY ? '' : v);

    /** The primitive wants a mutable list, and it holds the encoded values. */
    const primitiveItems = $derived(items.map(item => ({ ...item, value: encode(item.value) })));

    const selected = $derived(items.find(item => item.value === value));

    /** Read by the primitive; it holds the encoded value. */
    function getValue() {
        return encode(value);
    }

    /** Written by the primitive; it hands back the encoded value. */
    function setValue(next: string) {
        const decoded = decode(next);
        if (decoded === value) return;
        value = decoded;
        onValueChange?.(decoded);
    }
</script>

{#if label}
    <Label id={`${uid}-label`} for={id}>{label}</Label>
{/if}

<Select.Root type="single" items={primitiveItems} bind:value={getValue, setValue} {disabled}>
    <Select.Trigger
        {id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (label ? `${uid}-label` : undefined)}
        class={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm',
            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
    >
        <Select.Value {placeholder}>
            {#snippet child({ props })}
                <span {...props} class={cn('min-w-0 flex-1 truncate text-start', !selected && 'text-muted-foreground')}>
                    {selected?.label ?? placeholder ?? ''}
                </span>
            {/snippet}
        </Select.Value>
        <ChevronDown class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Select.Trigger>

    <Select.Portal>
        <Select.Content
            class={cn(
                'z-50 max-h-[min(20rem,var(--bits-select-content-available-height))] min-w-[var(--bits-select-anchor-width)]',
                'overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
                'focus:outline-none',
                contentClass,
            )}
            sideOffset={4}
        >
            <Select.Viewport>
                {#each items as item (item.value)}
                    <Select.Item
                        value={encode(item.value)}
                        label={item.label}
                        disabled={item.disabled}
                        class={cn(
                            'flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                            'outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                            'data-disabled:pointer-events-none data-disabled:opacity-50',
                        )}
                    >
                        {#snippet children({ selected: isSelected })}
                            <span class="min-w-0 flex-1 truncate">{item.label}</span>
                            {#if isSelected}
                                <Check class="size-4 shrink-0" aria-hidden="true" />
                            {/if}
                        {/snippet}
                    </Select.Item>
                {/each}
            </Select.Viewport>
        </Select.Content>
    </Select.Portal>
</Select.Root>
