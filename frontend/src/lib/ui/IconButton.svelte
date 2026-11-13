<script lang="ts">
    import type { Snippet } from 'svelte';
    import { mergeProps } from 'bits-ui';
    import { cn } from '$lib/utils/cn';
    import Button from '$lib/ui/button/Button.svelte';
    import Tooltip from '$lib/ui/tooltip/Tooltip.svelte';

    /**
     * An icon-only button with a tooltip.
     *
     * An icon button has no visible text, so the tooltip is what names it. The two are
     * wired together here rather than in the caller: the tooltip's trigger puts its own
     * handlers on the element, and spreading those over a button that has a handler of
     * its own would drop one of them. `mergeProps` keeps both.
     *
     * A disabled button is marked with `aria-disabled` rather than the native
     * `disabled` attribute. The native attribute makes the button unfocusable and
     * stops it receiving pointer events, so the tooltip could never be shown — which
     * is exactly when the reason for the button being unavailable is worth reading.
     * The click is blocked here instead.
     */
    type Props = {
        /** The tooltip's text, which is also the button's accessible name. */
        label: string;
        /** The button's action. */
        onclick?: () => void;
        disabled?: boolean;
        variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
        size?: 'default' | 'sm' | 'lg' | 'icon';
        /** Where the tooltip sits relative to the button. */
        side?: 'top' | 'right' | 'bottom' | 'left';
        /** Extra classes for the button. */
        class?: string;
        /** The icon. */
        children?: Snippet;
    };

    let {
        label,
        onclick,
        disabled = false,
        variant = 'outline',
        size = 'sm',
        side = 'top',
        class: className,
        children,
    }: Props = $props();
</script>

<Tooltip content={label} {side}>
    {#snippet child({ props })}
        <Button
            {...mergeProps(props, {
                onclick: () => {
                    if (disabled) return;

                    onclick?.();
                },
            })}
            {variant}
            {size}
            aria-disabled={disabled ? 'true' : undefined}
            class={cn('size-8', disabled && 'opacity-50', className)}
            aria-label={label}
        >
            {@render children?.()}
        </Button>
    {/snippet}
</Tooltip>
