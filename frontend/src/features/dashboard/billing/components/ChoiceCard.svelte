<script lang="ts">
    import type { Snippet } from 'svelte';
    import { CheckCircle2, Circle } from '@lucide/svelte';
    import { cn } from '$lib/utils/cn';

    /** A selectable card for the node and egg steps; behaves as a radio in its group. */
    type Props = {
        name: string;
        value: number;
        group: number | null;
        disabled?: boolean;
        onSelect: (value: number) => void;
        children: Snippet;
    };

    let { name, value, group, disabled = false, onSelect, children }: Props = $props();

    const checked = $derived(group === value);
</script>

<label
    class={cn(
        'flex items-start gap-3 rounded-md border p-4 text-sm transition-colors',
        checked ? 'border-foreground bg-accent' : 'border-border',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-accent',
    )}
>
    <input
        type="radio"
        class="sr-only"
        {name}
        {value}
        {checked}
        {disabled}
        onchange={() => onSelect(value)}
    />
    {#if checked}
        <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success" />
    {:else}
        <Circle class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    {/if}
    <div class="min-w-0 flex-1">{@render children()}</div>
</label>
