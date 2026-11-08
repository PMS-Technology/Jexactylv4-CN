<script lang="ts">
    import type { HTMLTextareaAttributes } from 'svelte/elements';
    import { cn } from '$lib/utils/cn';

    type Props = {
        value?: string;
        /** Marks the field invalid and links it to the error text for screen readers. */
        error?: string;
        class?: string;
    } & Omit<HTMLTextareaAttributes, 'class' | 'value'>;

    let { value = $bindable(''), error, class: className, ...rest }: Props = $props();

    const id = $props.id();
    const errorId = `${id}-error`;
</script>

<textarea
    bind:value
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={error ? errorId : undefined}
    class={cn(
        'min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error ? 'border-destructive' : 'border-input',
        className,
    )}
    {...rest}
></textarea>

{#if error}
    <p id={errorId} class="mt-1.5 text-xs text-destructive">{error}</p>
{/if}
