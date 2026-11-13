<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Tabs as TabsPrimitive } from 'bits-ui';
    import { cn } from '$lib/utils/cn';

    /**
     * A tabbed panel built on bits-ui's `Tabs` primitives.
     *
     * The primitive keeps every panel mounted and hides the inactive ones with the
     * `hidden` attribute, so a panel that measures itself (a chart, a terminal) has
     * to resize when it becomes visible again rather than only on mount.
     *
     * The list is a row of underlined tabs rather than a row of pills, which is the
     * shape the rest of the panel uses for navigation.
     */
    type Props = {
        /** The tabs to show, in order. */
        items: readonly { value: string; label: string; disabled?: boolean }[];
        /** The active tab's value. */
        value?: string;
        /** Accessible name for the tab list. */
        'aria-label'?: string;
        /** Called when the active tab changes. */
        onValueChange?: (value: string) => void;
        /** Extra classes for the tab list. */
        listClass?: string;
        /** Extra classes for each panel. */
        contentClass?: string;
        /** The panels, one per tab, in the same order as `items`. */
        children?: Snippet<[{ value: string }]>;
    };

    let {
        items,
        value = $bindable(''),
        'aria-label': ariaLabel,
        onValueChange,
        listClass,
        contentClass,
        children,
    }: Props = $props();
</script>

<TabsPrimitive.Root bind:value onValueChange={v => onValueChange?.(v)}>
    <TabsPrimitive.List
        aria-label={ariaLabel}
        class={cn(
            'flex gap-1 overflow-x-auto border-b border-border scrollbar-thin',
            listClass,
        )}
    >
        {#each items as item (item.value)}
            <TabsPrimitive.Trigger
                value={item.value}
                disabled={item.disabled}
                class={cn(
                    '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2',
                    'text-sm whitespace-nowrap text-muted-foreground transition-colors',
                    'hover:text-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'disabled:pointer-events-none disabled:opacity-50',
                    'data-[state=active]:border-primary data-[state=active]:font-medium data-[state=active]:text-foreground',
                )}
            >
                {item.label}
            </TabsPrimitive.Trigger>
        {/each}
    </TabsPrimitive.List>

    {#each items as item (item.value)}
        <TabsPrimitive.Content
            value={item.value}
            class={cn('focus-visible:outline-none', contentClass)}
        >
            {@render children?.({ value: item.value })}
        </TabsPrimitive.Content>
    {/each}
</TabsPrimitive.Root>
