import http, { type FractalResponseList } from '$lib/api/http';
import type { Ticket } from '$lib/api/definitions/account';
import { toTicket } from '$lib/api/transformers/account';

/** Support ticket endpoints under `/api/client/account/tickets`, ported from `api/routes/account/tickets.ts`. */

export const ticketKeys = {
    all: ['account', 'tickets'] as const,
    detail: (id: number) => ['account', 'tickets', id] as const,
};

export async function getTickets(): Promise<Ticket[]> {
    const { data } = await http.get('/api/client/account/tickets');

    return (data as FractalResponseList).data.map(toTicket);
}

export async function getTicket(id: number): Promise<Ticket> {
    const { data } = await http.get(`/api/client/account/tickets/${id}`, { params: { include: 'messages' } });

    return toTicket(data);
}

/** Creates a ticket; the message becomes its first entry. */
export async function createTicket(title: string, message: string): Promise<Ticket> {
    const { data } = await http.post('/api/client/account/tickets', { title, message });

    return toTicket(data);
}

/** Adds a reply. The response omits messages, so callers refetch the ticket afterwards. */
export async function addTicketMessage(id: number, message: string): Promise<void> {
    await http.post(`/api/client/account/tickets/${id}/messages`, { message });
}

export async function deleteTicket(id: number): Promise<void> {
    await http.delete(`/api/client/account/tickets/${id}`);
}
