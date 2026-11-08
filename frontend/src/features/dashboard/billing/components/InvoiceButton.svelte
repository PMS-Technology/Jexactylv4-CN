<script lang="ts">
    import { FileDown, FileClock } from '@lucide/svelte';
    import { downloadInvoice } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { Order } from '$lib/api/definitions/billing';

    let { order, onError }: { order: Order; onError: (message: string) => void } = $props();

    let downloading = $state(false);

    async function download() {
        if (!order.invoice || downloading) return;

        downloading = true;
        try {
            await downloadInvoice(order.id, `${order.invoice.number ?? order.id}.pdf`);
        } catch (e) {
            onError(httpErrorToHuman(e));
        } finally {
            downloading = false;
        }
    }
</script>

{#if order.invoice}
    <button
        type="button"
        class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        title="下载发票"
        aria-label="下载订单 {order.id} 的发票"
        disabled={downloading}
        onclick={download}
    >
        <FileDown class="size-4" />
    </button>
{:else}
    <span class="inline-flex p-1.5 text-muted-foreground/60" title="发票正在生成，请稍后再来查看。">
        <FileClock class="size-4" />
    </span>
{/if}
