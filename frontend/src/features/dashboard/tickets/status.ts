import type { TicketStatus } from '$lib/api/definitions/account';

/** Labels and badge colours for ticket states, matching the legacy `statusToColor` mapping. */
export const ticketStatus: Record<TicketStatus, { label: string; class: string }> = {
    pending: { label: '待处理', class: 'bg-muted text-muted-foreground' },
    'in-progress': { label: '处理中', class: 'bg-warning/15 text-warning' },
    unresolved: { label: '未解决', class: 'bg-destructive/15 text-destructive' },
    resolved: { label: '已解决', class: 'bg-success/15 text-success' },
};
