<script lang="ts" generics="T">
    import type { Component, Snippet } from 'svelte';
    import { Trash2 } from '@lucide/svelte';
    import { Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /** Shared list chrome for the passkey, SSH key and API key tabs. */
    type Props = {
        items: T[] | undefined;
        key: (item: T) => string;
        loading: boolean;
        error?: string;
        empty: string;
        icon: Component<any>;
        /** Name of the item, used for the delete button's accessible label. */
        label: (item: T) => string;
        row: Snippet<[T]>;
        onDelete: (item: T) => void;
    };

    let { items, key, loading, error, empty, icon: Icon, label, row, onDelete }: Props = $props();
</script>

{#if error}
    <Alert variant="destructive">{error}</Alert>
{:else if loading && !items}
    <Spinner centered />
{:else if !items?.length}
    <p class="py-8 text-center text-sm text-muted-foreground">{empty}</p>
{:else}
    <ul class="divide-y divide-border">
        {#each items as item (key(item))}
            <li class="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <Icon class="size-4 shrink-0 text-muted-foreground" />
                <div class="min-w-0 flex-1">{@render row(item)}</div>
                <button
                    type="button"
                    class="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    aria-label="删除 {label(item)}"
                    onclick={() => onDelete(item)}
                >
                    <Trash2 class="size-4" />
                </button>
            </li>
        {/each}
    </ul>
{/if}
