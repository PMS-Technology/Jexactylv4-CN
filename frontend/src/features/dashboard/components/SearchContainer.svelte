<script lang="ts">
    import { Search } from '@lucide/svelte';
    import SearchModal from './SearchModal.svelte';

    /**
     * Search entry for the global server search, ported from
     * `@account/search/SearchContainer.tsx`: a trigger plus the ⌘/ hotkey (Ctrl+/ off
     * Macs), suppressed while the user is typing in a field.
     *
     * `compact` renders an icon-only trigger for the mobile bottom bar.
     */
    let { compact = false }: { compact?: boolean } = $props();

    let open = $state(false);

    function onKeydown(event: KeyboardEvent) {
        const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === '/') {
            event.preventDefault();
            open = true;
        }
    }
</script>

<svelte:window onkeydown={onKeydown} />

<SearchModal bind:open />

{#if compact}
    <button
        type="button"
        aria-label="搜索服务器"
        onclick={() => (open = true)}
        class="flex size-9 items-center justify-center rounded-md text-muted-foreground
               transition-colors hover:bg-accent hover:text-accent-foreground"
    >
        <Search class="size-4 shrink-0" />
    </button>
{:else}
    <button
        type="button"
        onclick={() => (open = true)}
        class="flex w-full items-center gap-3 rounded-md border border-sidebar-border px-3 py-2 text-sm
               text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
        <Search class="size-4 shrink-0" />
        <span>搜索服务器</span>
        <kbd
            class="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground"
        >
            ⌘/
        </kbd>
    </button>
{/if}
