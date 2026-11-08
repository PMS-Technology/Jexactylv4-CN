import type { FractalResponseData, FractalResponseList } from '$lib/api/http';
import type {
    ActivityActor,
    ActivityLog,
    ApiKey,
    Passkey,
    SSHKey,
    Ticket,
    TicketMessage,
} from '$lib/api/definitions/account';

/** Fractal → model transformers, ported from `api/definitions/account/transformers.ts`. */

export function toActivityLog({ attributes }: FractalResponseData): ActivityLog {
    const actor = attributes.relationships?.actor as FractalResponseData | null | undefined;

    return {
        id: attributes.id,
        batch: attributes.batch ?? null,
        event: attributes.event,
        ip: attributes.ip ?? null,
        isApi: Boolean(attributes.is_api),
        description: attributes.description ?? null,
        // PHP serialises an empty object as `{}`, but guard against `[]` all the same.
        properties: attributes.properties && !Array.isArray(attributes.properties) ? attributes.properties : {},
        hasAdditionalMetadata: attributes.has_additional_metadata ?? false,
        timestamp: new Date(attributes.timestamp),
        // A missing actor arrives as `{ object: 'null_resource', attributes: null }`.
        actor: actor?.attributes ? toActivityActor(actor) : null,
    };
}

function toActivityActor({ attributes }: FractalResponseData): ActivityActor {
    return {
        uuid: attributes.uuid,
        username: attributes.username,
        email: attributes.email,
        image: attributes.image ?? null,
    };
}

export function toApiKey({ attributes }: FractalResponseData): ApiKey {
    return {
        id: attributes.id,
        identifier: attributes.identifier,
        description: attributes.description,
        allowedIps: attributes.allowed_ips ?? [],
        createdAt: attributes.created_at ? new Date(attributes.created_at) : null,
        lastUsedAt: attributes.last_used_at ? new Date(attributes.last_used_at) : null,
    };
}

export function toSSHKey({ attributes }: FractalResponseData): SSHKey {
    return {
        name: attributes.name,
        publicKey: attributes.public_key,
        fingerprint: attributes.fingerprint,
        createdAt: new Date(attributes.created_at),
    };
}

export function toPasskey({ attributes }: FractalResponseData): Passkey {
    return {
        uuid: attributes.uuid,
        name: attributes.name,
        lastUsedAt: attributes.last_used_at ? new Date(attributes.last_used_at) : null,
        createdAt: new Date(attributes.created_at),
    };
}

export function toTicketMessage({ attributes }: FractalResponseData): TicketMessage {
    return {
        id: attributes.id,
        message: String(attributes.message),
        author: attributes.author ?? null,
        createdAt: new Date(attributes.created_at),
        updatedAt: attributes.updated_at ? new Date(attributes.updated_at) : null,
    };
}

export function toTicket({ attributes }: FractalResponseData): Ticket {
    const messages = attributes.relationships?.messages as FractalResponseList | undefined;

    return {
        id: attributes.id,
        title: attributes.title,
        status: attributes.status,
        createdAt: new Date(attributes.created_at),
        // The legacy transformer read `attributes.updatedAt`, which never exists, so it was
        // always null there. The backend does send `updated_at`.
        updatedAt: attributes.updated_at ? new Date(attributes.updated_at) : null,
        messages: messages?.data ? messages.data.map(toTicketMessage) : null,
    };
}
