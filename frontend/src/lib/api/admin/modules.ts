import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';
import type { TicketStatus } from '$lib/api/definitions/account';

/**
 * Admin "modules" endpoints for tickets and AI, ported from
 * `api/routes/admin/{tickets,ai}.ts`, plus the user lookup the ticket forms use.
 */

// --- Users (lookup only) ----------------------------------------------------

/** The subset of a user the ticket screens show. Ticket payloads embed the raw model. */
export interface UserSummary {
    id: number;
    uuid: string;
    username: string;
    email: string;
    /** Root admin or holder of an admin role: anyone who can open /admin. */
    isAdmin: boolean;
    avatarUrl: string | null;
}

const toUserSummary = (raw: Record<string, any>): UserSummary => ({
    id: raw.id,
    uuid: raw.uuid,
    username: raw.username,
    email: raw.email,
    isAdmin: Boolean(raw.root_admin) || Boolean(raw.admin_role_id),
    avatarUrl: raw.avatar_url ?? null,
});

/**
 * Searches users by uuid, username, email or external id in one request through the
 * `filter[*]` callback; the legacy picker sent two requests and merged them.
 */
export async function searchUsers(query: string): Promise<UserSummary[]> {
    const { data } = await http.get('/api/application/users', { params: { 'filter[*]': query, per_page: 10 } });

    return (data as FractalPaginatedResponse).data.map(({ attributes }) => toUserSummary(attributes));
}

// --- Tickets ----------------------------------------------------------------

export interface AdminTicket {
    id: number;
    title: string;
    status: TicketStatus;
    /** Null when the owning account was deleted. */
    user: UserSummary | null;
    assignedTo: UserSummary | null;
    createdAt: Date;
}

export interface AdminTicketMessage {
    id: number;
    message: string;
    /** Null when the author account was deleted. */
    author: UserSummary | null;
    createdAt: Date;
}

export interface TicketValues {
    title: string;
    user_id: number;
    assigned_to: number | null;
    status: TicketStatus;
}

const toTicket = ({ attributes: a }: FractalResponseData): AdminTicket => ({
    id: a.id,
    title: a.title,
    status: a.status,
    user: a.user ? toUserSummary(a.user) : null,
    assignedTo: a.assigned_to ? toUserSummary(a.assigned_to) : null,
    createdAt: new Date(a.created_at),
});

const toMessage = ({ attributes: a }: FractalResponseData): AdminTicketMessage => ({
    id: a.id,
    message: String(a.message),
    author: a.author ? toUserSummary(a.author) : null,
    createdAt: new Date(a.created_at),
});

export type TicketQuery = QueryBuilderParams<'title' | 'status', 'id' | 'title' | 'status' | 'created_at'>;

export async function getAdminTickets(params: TicketQuery = {}): Promise<PaginatedResult<AdminTicket>> {
    const { data } = await http.get('/api/application/tickets', { params: withQueryBuilderParams(params) });

    return {
        items: (data as FractalPaginatedResponse).data.map(toTicket),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

export async function getAdminTicket(id: number): Promise<AdminTicket> {
    const { data } = await http.get(`/api/application/tickets/${id}`);

    return toTicket(data);
}

export async function createAdminTicket(values: TicketValues): Promise<AdminTicket> {
    const { data } = await http.post('/api/application/tickets', values);

    return toTicket(data);
}

/**
 * The backend validates the full ticket (title, owner and status are required) and then
 * applies every field it was sent, so a cleared assignee must go up as an explicit null.
 */
export async function updateAdminTicket(id: number, values: TicketValues): Promise<AdminTicket> {
    const { data } = await http.put(`/api/application/tickets/${id}`, values);

    return toTicket(data);
}

/** Deletes the ticket and all of its messages. */
export async function deleteAdminTicket(id: number): Promise<void> {
    await http.delete(`/api/application/tickets/${id}`);
}

/** Newest first; the legacy table reversed each page client-side instead. */
export async function getAdminTicketMessages(id: number, page = 1): Promise<PaginatedResult<AdminTicketMessage>> {
    const { data } = await http.get(`/api/application/tickets/${id}/messages`, { params: { page, sort: '-id' } });

    return {
        items: (data as FractalPaginatedResponse).data.map(toMessage),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

/** Posts as the signed-in admin. TicketMessage rules: 3–500 characters. */
export async function createAdminTicketMessage(ticketId: number, message: string): Promise<AdminTicketMessage> {
    const { data } = await http.post('/api/application/tickets/message', { ticket_id: ticketId, message });

    return toMessage(data);
}

/** Stores `modules:tickets:<key>`; the panel reads `enabled` and `max_count`. */
export async function updateTicketSetting(key: 'enabled' | 'max_count', value: boolean | number): Promise<void> {
    await http.put('/api/application/tickets/settings', { key, value });
}

// --- AI ---------------------------------------------------------------------

export interface AISettingsUpdate {
    enabled?: boolean;
    user_access?: boolean;
    /** Only send a real key. An empty string reaches the backend as null and wipes it. */
    key?: string;
}

export async function updateAISettings(settings: AISettingsUpdate): Promise<void> {
    await http.put('/api/application/ai/settings', settings);
}

/** Sends a prompt to Gemini through the panel and returns the text answer. */
export async function queryAI(query: string): Promise<string> {
    const { data } = await http.post('/api/application/ai/query', { query });

    return String(data);
}
