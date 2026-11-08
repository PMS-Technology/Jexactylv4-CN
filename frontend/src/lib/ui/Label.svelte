<script lang="ts">
    import type { Snippet } from 'svelte';
    import { cn } from '$lib/utils/cn';

    type Props = {
        for?: string;
        required?: boolean;
        class?: string;
        children?: Snippet;
    };

    let { for: htmlFor, required = false, class: className, children }: Props = $props();
</script>

<label for={htmlFor} class={cn('mb-1.5 block text-sm font-medium', className)}>
    {@render children?.()}
    {#if required}
        <span class="text-destructive" aria-hidden="true">*</span>
    {/if}
</label>
