<script lang="ts">
    import type { Snippet } from 'svelte';

    type Props = {
        title: string;
        description?: string;
        /** Actions rendered on the trailing edge of the header. */
        children?: Snippet;
    };

    let { title, description, children }: Props = $props();
</script>

<header class="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div class="space-y-1">
        <h1 class="font-header text-xl font-semibold tracking-tight">{title}</h1>
        {#if description}
            <p class="text-sm text-muted-foreground">{description}</p>
        {/if}
    </div>

    {#if children}
        <div class="flex items-center gap-2">
            {@render children()}
        </div>
    {/if}
</header>
