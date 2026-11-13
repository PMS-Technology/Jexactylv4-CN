<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Toggle as TogglePrimitive } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

    /**
     * A two-state button built on bits-ui's `Toggle` primitive.
     *
     * The primitive renders a `<button>` with `aria-pressed`, so the state is carried
     * by the accessibility tree rather than by the icon that happens to be showing.
     */
    type Props = {
        /** Whether the button is pressed. */
        pressed?: boolean;
        disabled?: boolean;
        /** Accessible name, when there is no visible label. */
        'aria-label'?: string;
        /** Called when the button is pressed or released. */
        onPressedChange?: (pressed: boolean) => void;
        class?: string;
        /** The button's content; it is told whether the button is pressed. */
        content?: Snippet<[{ pressed: boolean }]>;
    };

    let {
        pressed = $bindable(false),
        disabled = false,
        'aria-label': ariaLabel,
        onPressedChange,
        class: className,
        content,
    }: Props = $props();
</script>

<TogglePrimitive.Root
    bind:pressed
    {disabled}
    aria-label={ariaLabel}
    onPressedChange={v => onPressedChange?.(v)}
    class={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
        className,
    )}
>
    {#snippet children({ pressed: isPressed })}
        {@render content?.({ pressed: isPressed })}
    {/snippet}
</TogglePrimitive.Root>
