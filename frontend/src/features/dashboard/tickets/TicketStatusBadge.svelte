<script lang="ts">
    import type { TicketStatus } from '$lib/api/definitions/account';
    import { cn } from '$lib/utils/cn';
    import { ticketStatus } from './status';

    let { status }: { status: TicketStatus } = $props();

    // Unknown values fall back to the pending style rather than rendering nothing.
    const meta = $derived(ticketStatus[status] ?? { label: status, class: ticketStatus.pending.class });
</script>

<span class={cn('inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', meta.class)}>
    {meta.label}
</span>
