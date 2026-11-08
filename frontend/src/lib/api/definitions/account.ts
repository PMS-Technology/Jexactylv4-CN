/**
 * Account credential models, ported from `api/definitions/account/models.d.ts`.
 *
 * Field names follow the legacy client so the transformers stay a one-to-one port.
 */

export interface ApiKey {
    id: number;
    identifier: string;
    description: string;
    allowedIps: string[];
    createdAt: Date | null;
    lastUsedAt: Date | null;
}

export interface SSHKey {
    name: string;
    publicKey: string;
    fingerprint: string;
    createdAt: Date;
}

export interface Passkey {
    uuid: string;
    name: string;
    lastUsedAt: Date | null;
    createdAt: Date;
}

export interface TwoFactorTokenData {
    /** `otpauth://` URI, encoded into the QR code. */
    image_url_data: string;
    secret: string;
}

/** The user behind an activity entry, from the `actor` include (`UserTransformer`). */
export interface ActivityActor {
    uuid: string;
    username: string;
    email: string;
    image: string | null;
}

export interface ActivityLog {
    /** sha1 of the row id; only unique enough to key list rendering. */
    id: string;
    batch: string | null;
    event: string;
    /** Null when the viewer is neither the actor nor a root admin. */
    ip: string | null;
    isApi: boolean;
    description: string | null;
    properties: Record<string, unknown>;
    hasAdditionalMetadata: boolean;
    timestamp: Date;
    /** Null for system events and actors that are no longer users. */
    actor: ActivityActor | null;
}

export type TicketStatus = 'pending' | 'in-progress' | 'unresolved' | 'resolved';

export interface TicketMessage {
    id: number;
    message: string;
    /** The author's user record, serialized straight from the Eloquent model. */
    author: { uuid: string; email: string; username: string } | null;
    createdAt: Date;
    updatedAt: Date | null;
}

export interface Ticket {
    id: number;
    title: string;
    status: TicketStatus;
    createdAt: Date;
    updatedAt: Date | null;
    /** Only present when the request asked for `include=messages`. */
    messages: TicketMessage[] | null;
}
