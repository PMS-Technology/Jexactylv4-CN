<script lang="ts">
    import { Meter as MeterPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

    /**
     * A usage meter built on bits-ui's `Meter` primitive.
     *
     * The primitive renders a single `role="meter"` element; the filled part is a
     * child that is slid across the track, so the amount used is shown by position
     * rather than by a second colour. `aria-valuetext` carries the readable value,
     * because the raw number means nothing to a screen reader on its own.
     *
     * The track and the fill take their colours from the caller: a meter that means
     * "how close to the limit" is a status readout, not a series, so the colour is
     * part of the caller's decision rather than the component's.
     */
    type Props = {
        /** The current value, in the same unit as `max`. */
        value: number;
        /** The value that counts as full. */
        max: number;
        /** Accessible name, when there is no visible label. */
        'aria-label'?: string;
        /** Id of the element naming the meter. */
        'aria-labelledby'?: string;
        /** Readable form of the value, e.g. "1.5 GiB / 4 GiB". */
        'aria-valuetext'?: string;
        /** Colour of the filled part. */
        fillClass?: string;
        /** Colour of the track behind it. */
        trackClass?: string;
        /** Height of the meter. */
        class?: string;
    };

    let {
        value,
        max,
        'aria-label': ariaLabel,
        'aria-labelledby': ariaLabelledBy,
        'aria-valuetext': ariaValueText,
        fillClass = 'bg-primary',
        trackClass = 'bg-muted',
        class: className,
    }: Props = $props();

    // A limit of zero means unlimited, which is not the same as "empty"; the bar is
    // left empty rather than divided by zero.
    const ratio = $derived(max > 0 ? Math.min(1, Math.max(0, value / max)) : 0);
</script>

<MeterPrimitive.Root
    {value}
    {max}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabelledBy}
    aria-valuetext={ariaValueText}
    class={cn('relative h-1.5 w-full overflow-hidden rounded-full', trackClass, className)}
>
    <div
        class={cn('h-full w-full rounded-full transition-[transform] duration-300 ease-out', fillClass)}
        style:transform="translateX(-{100 - ratio * 100}%)"
    ></div>
</MeterPrimitive.Root>
