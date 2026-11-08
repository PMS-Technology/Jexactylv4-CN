<script lang="ts">
    import { Search } from '@lucide/svelte';

    let { value = $bindable(''), placeholder }: { value?: string; placeholder: string } = $props();
</script>

<div class="relative w-full max-w-xs">
    <Search class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    <input
        type="search"
        bind:value
        {placeholder}
        aria-label={placeholder}
        class="h-9 w-full rounded-md border border-input bg-background pr-3 pl-8 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    />
</div>
