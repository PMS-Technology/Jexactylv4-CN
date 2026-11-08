<script lang="ts">
    import { cn } from '$lib/utils/cn';

    type Props = {
        size?: 'sm' | 'default' | 'lg';
        centered?: boolean;
        label?: string;
        class?: string;
    };

    let { size = 'default', centered = false, label = 'Loading', class: className }: Props = $props();

    const sizes = { sm: 'size-4 border-2', default: 'size-8 border-2', lg: 'size-12 border-[3px]' } as const;
</script>

{#if centered}
    <div class="flex w-full items-center justify-center py-16">
        <div
            class={cn('animate-spin rounded-full border-muted-foreground/25 border-t-foreground', sizes[size], className)}
            role="status"
            aria-label={label}
        ></div>
    </div>
{:else}
    <div
        class={cn('animate-spin rounded-full border-muted-foreground/25 border-t-current', sizes[size], className)}
        role="status"
        aria-label={label}
    ></div>
{/if}
