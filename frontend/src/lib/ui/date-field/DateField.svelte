<script lang="ts">
    import { DateField } from 'bits-ui';
    import {
        CalendarDateTime,
        parseDate,
        parseDateTime,
        today,
        getLocalTimeZone,
        type DateValue,
    } from '@internationalized/date';
    import { cn } from '$lib/utils/cn';
    import Label from '$lib/ui/Label.svelte';

    /**
     * A date field built on bits-ui's `DateField` primitive.
     *
     * The primitive renders the date as segments the user types into, rather than as a
     * native `<input type="date">`, so it works the same on every browser and can be
     * styled like the rest of the form.
     *
     * The value is kept as a plain local wall-clock string — `YYYY-MM-DD` for a date,
     * `YYYY-MM-DDTHH:mm` for a date and time — which is what the panel's API takes and
     * what the rest of the frontend uses. It is parsed into a `CalendarDate` or
     * `CalendarDateTime` for the primitive and formatted back on the way out; no
     * timezone is attached, so the time the user picks is the time that is stored.
     */
    type Props = {
        /** The selected date, as `YYYY-MM-DD` (or `YYYY-MM-DDTHH:mm` with a time). */
        value?: string;
        /** Whether the field holds a time as well as a date. */
        withTime?: boolean;
        /** Visible label, which also names the field. */
        label?: string;
        /** Accessible name, for a field with no visible label. */
        'aria-label'?: string;
        /** Id of the element naming the field, when the label sits outside the component. */
        'aria-labelledby'?: string;
        /** Id of the field, so a `<label for>` elsewhere can point at it. */
        id?: string;
        /** The earliest date that can be picked. */
        min?: string;
        /** The latest date that can be picked. */
        max?: string;
        disabled?: boolean;
        /** The locale the date is written in. */
        locale?: string;
        /** Extra classes for the field. */
        class?: string;
        /** Called when the date changes. */
        onValueChange?: (value: string) => void;
    };

    let {
        value = $bindable(''),
        withTime = false,
        label,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        id,
        min,
        max,
        disabled = false,
        locale = 'zh-CN',
        class: className,
        onValueChange,
    }: Props = $props();

    const uid = $props.id();

    const granularity = $derived(withTime ? ('minute' as const) : ('day' as const));

    /**
     * The panel writes wall-clock times, so the field reads them back the way a
     * `datetime-local` input does: on a 24-hour clock.
     */
    const hourCycle = $derived(withTime ? (24 as const) : undefined);

    /**
     * The date the field starts from when it holds none.
     *
     * A field with a time needs a `CalendarDateTime` placeholder: the primitive reads
     * the placeholder to decide which parts exist, and a plain date leaves the hour and
     * minute segments out, so they cannot be typed into.
     */
    const placeholder = $derived.by(() => {
        const base = today(getLocalTimeZone());
        if (min) {
            const parsed = parseDate(min.slice(0, 10));
            if (parsed.compare(base) > 0) {
                return withTime
                    ? new CalendarDateTime(parsed.year, parsed.month, parsed.day, 0, 0)
                    : parsed;
            }
        }
        return withTime
            ? new CalendarDateTime(base.year, base.month, base.day, 0, 0)
            : base;
    });

    /** The parsed date, or undefined when the field holds none. */
    const date = $derived.by(() => {
        if (!value) return undefined;
        return parse(withTime ? value.slice(0, 16) : value.slice(0, 10));
    });

    const minDate = $derived.by(() => (min ? parse(min.slice(0, 10)) : undefined));
    const maxDate = $derived.by(() => (max ? parse(max.slice(0, 10)) : undefined));

    /**
     * Parses a value into the type the primitive wants. A malformed value is treated as
     * no value rather than an error, so a bad record cannot break the page.
     */
    function parse(text: string): DateValue | undefined {
        try {
            return withTime ? parseDateTime(text) : parseDate(text);
        } catch {
            return undefined;
        }
    }

    function handleChange(next: DateValue | undefined) {
        if (!next) {
            if (value === '') return;
            value = '';
            onValueChange?.('');
            return;
        }

        const text = next.toString();
        // `toString` renders the time as `HH:mm:ss`; the panel keeps minutes.
        const formatted = withTime ? text.slice(0, 16) : text.slice(0, 10);
        if (formatted === value) return;
        value = formatted;
        onValueChange?.(formatted);
    }
</script>

{#if label}
    <Label id={`${uid}-label`} for={id}>{label}</Label>
{/if}

<DateField.Root
    value={date}
    {placeholder}
    {disabled}
    {locale}
    {granularity}
    {hourCycle}
    minValue={minDate}
    maxValue={maxDate}
    onValueChange={handleChange}
>
    <DateField.Input
        {id}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (label ? `${uid}-label` : undefined)}
        class={cn(
            'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm',
            'focus-within:ring-2 focus-within:ring-ring focus-within:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
    >
        {#snippet children({ segments })}
            {#each segments as { part, value: segmentValue }, i (part + i)}
                {#if part === 'literal'}
                    <DateField.Segment {part} class="px-0.5 text-muted-foreground">
                        {segmentValue}
                    </DateField.Segment>
                {:else}
                    <DateField.Segment
                        {part}
                        class="rounded px-0.5 hover:bg-muted focus:bg-muted focus-visible:ring-0"
                    >
                        {segmentValue}
                    </DateField.Segment>
                {/if}
            {/each}
        {/snippet}
    </DateField.Input>
</DateField.Root>
