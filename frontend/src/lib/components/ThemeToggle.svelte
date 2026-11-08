<script lang="ts">
    import { Moon, Sun } from '@lucide/svelte';
    import { theme } from '$lib/stores/theme.svelte';
    import { cn } from '$lib/utils/cn';

    let { class: className }: { class?: string } = $props();
</script>

<button
    type="button"
    class={cn(
        'inline-flex size-9 items-center justify-center rounded-md text-muted-foreground',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
    )}
    onclick={() => theme.toggle()}
    aria-label={theme.resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
>
    {#if theme.resolved === 'dark'}
        <Sun class="size-4" />
    {:else}
        <Moon class="size-4" />
    {/if}
</button>
