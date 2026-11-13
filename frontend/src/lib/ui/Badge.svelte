<script lang="ts">
    import type { Snippet } from 'svelte';
    import { cn } from '$lib/utils/cn';

    /**
     * A small status pill.
     *
     * The variants carry the panel's own tokens, so a badge that means "running" and
     * a badge that means "offline" read the same everywhere. The tone is never the
     * only cue: the label inside says what the state is.
     */
    type Props = {
        variant?: 'default' | 'muted' | 'success' | 'warning' | 'destructive';
        /** Small dot in front of the label, for a state that is read at a glance. */
        dot?: boolean;
        class?: string;
        children?: Snippet;
    };

    let { variant = 'default', dot = false, class: className, children }: Props = $props();

    const variants = {
        default: 'border-border bg-muted/60 text-foreground',
        muted: 'border-border bg-muted text-muted-foreground',
        success: 'border-success/30 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/10 text-warning',
        destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
    } as const;

    const dots = {
        default: 'bg-current',
        muted: 'bg-current',
        success: 'bg-success',
        warning: 'bg-warning',
        destructive: 'bg-destructive',
    } as const;
</script>

<span
    class={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5',
        'text-2xs font-medium whitespace-nowrap',
        variants[variant],
        className,
    )}
>
    {#if dot}
        <span class={cn('size-2 shrink-0 rounded-full', dots[variant])}></span>
    {/if}
    {@render children?.()}
</span>
