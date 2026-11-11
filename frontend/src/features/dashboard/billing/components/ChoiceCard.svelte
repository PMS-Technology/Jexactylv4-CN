<script lang="ts">
    import type { Snippet } from 'svelte';
    import { RadioGroup } from 'bits-ui';
    import { CheckCircle2, Circle } from '@lucide/svelte';
    import { cn } from '$lib/utils/cn';

    /**
     * A selectable card for the node and egg steps; behaves as a radio in its group.
     *
     * The card is the radio itself: the primitive renders a button with
     * `role="radio"`, so the whole card is clickable and carries the group's checked
     * state through `data-state`.
     */
    type Props = {
        /** The option's value; this is what the group's value holds. */
        value: string;
        disabled?: boolean;
        children: Snippet;
    };

    let { value, disabled = false, children: content }: Props = $props();
</script>

<RadioGroup.Item {value} {disabled}>
    {#snippet child({ props, checked })}
        <button
            {...props}
            class={cn(
                'flex w-full items-start gap-3 rounded-md border p-4 text-sm transition-colors',
                'text-left font-normal',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'border-border hover:bg-accent',
                'data-[state=checked]:border-foreground data-[state=checked]:bg-accent',
            )}
        >
            {#if checked}
                <CheckCircle2 class="mt-0.5 size-4 shrink-0 text-success" />
            {:else}
                <Circle class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {/if}
            <div class="min-w-0 flex-1">{@render content()}</div>
        </button>
    {/snippet}
</RadioGroup.Item>
