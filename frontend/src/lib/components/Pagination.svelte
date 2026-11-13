<script lang="ts">
    import { ChevronLeft, ChevronRight } from '@lucide/svelte';
    import { Button } from '$lib/ui';

    interface Props {
        pagination?: {
            total: number;
            count: number;
            perPage: number;
            currentPage: number;
            totalPages: number;
        };
        currentPage: number;
        onPageChange: (page: number) => void;
    }

    const { pagination, currentPage, onPageChange }: Props = $props();

    const canGoBack = $derived(currentPage > 1);
    const canGoForward = $derived(pagination && currentPage < pagination.totalPages);
</script>

{#if pagination && pagination.totalPages > 1}
    <!-- Stacked on a phone: side by side, the count is squeezed into a sliver. -->
    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm whitespace-nowrap text-muted-foreground">
            显示第 {pagination.count} 项，共 {pagination.total} 项
        </p>

        <div class="flex flex-wrap items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onclick={() => onPageChange(currentPage - 1)}
                disabled={!canGoBack}
            >
                <ChevronLeft class="mr-1 size-4" />
                上一页
            </Button>

            <div class="flex items-center gap-1 px-2">
                {#each Array.from({ length: pagination.totalPages }, (_, i) => i + 1) as page}
                    {#if Math.abs(page - currentPage) <= 1 || page === 1 || page === pagination.totalPages}
                        <Button
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onclick={() => onPageChange(page)}
                            disabled={page === currentPage}
                        >
                            {page}
                        </Button>
                    {:else if Math.abs(page - currentPage) === 2}
                        <span class="px-1 text-muted-foreground">...</span>
                    {/if}
                {/each}
            </div>

            <Button
                variant="outline"
                size="sm"
                onclick={() => onPageChange(currentPage + 1)}
                disabled={!canGoForward}
            >
                下一页
                <ChevronRight class="ml-1 size-4" />
            </Button>
        </div>
    </div>
{/if}
