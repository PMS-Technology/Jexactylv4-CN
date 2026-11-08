import type { TicketStatus } from '$lib/api/definitions/account';
import { ticketStatus } from '$features/dashboard/tickets/status';

/** Select options in the legacy order, labelled like the client-side badges. */
export const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = (
    ['pending', 'in-progress', 'resolved', 'unresolved'] as const
).map(value => ({ value, label: ticketStatus[value].label }));
