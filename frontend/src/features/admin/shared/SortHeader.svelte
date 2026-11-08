<script lang="ts" generics="K extends string">
    import { ArrowDown, ArrowUp } from '@lucide/svelte';
    import type { TableState } from './table.svelte';

    let { table, key, label }: { table: TableState<K>; key: K; label: string } = $props();

    const dir = $derived(table.sort?.key === key ? table.sort.dir : null);
</script>

<th scope="col" class="px-4 py-2 font-medium" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}>
    <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => table.toggleSort(key)}>
        {label}
        {#if dir === 'asc'}<ArrowUp class="size-3" />{:else if dir === 'desc'}<ArrowDown class="size-3" />{/if}
    </button>
</th>
