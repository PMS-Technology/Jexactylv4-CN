import type { FractalResponseData } from '$lib/api/http';
import type {
    BillingEgg,
    BillingNode,
    Category,
    DiscountCode,
    Invoice,
    Order,
    Product,
} from '$lib/api/definitions/billing';
import { toServer } from '$lib/api/transformers/server';

/**
 * Fractal → model transformers, ported from `api/definitions/account/billing/transformers.ts`.
 *
 * `price` and `total` are `double` columns without an Eloquent cast, so depending on the
 * PDO driver they can arrive as strings; they are coerced here so arithmetic is safe.
 */

export function toCategory({ attributes: data }: FractalResponseData): Category {
    return {
        id: Number(data.id),
        name: data.name,
        icon: data.icon || null,
        description: data.description || null,
    };
}

export function toProduct({ attributes: data }: FractalResponseData): Product {
    return {
        id: data.id,
        name: data.name,
        icon: data.icon || null,
        price: Number(data.price),
        description: data.description || null,
        eggId: data.egg_id ?? null,
        limits: {
            cpu: data.limits.cpu,
            memory: data.limits.memory,
            disk: data.limits.disk,
            backup: data.limits.backup,
            database: data.limits.database,
            allocation: data.limits.allocation,
        },
    };
}

export function toBillingNode({ attributes: data }: FractalResponseData): BillingNode {
    return {
        id: Number(data.id),
        name: data.name,
        fqdn: data.fqdn,
        deployable: Boolean(data.deployable),
        deployableFree: Boolean(data.deployable_free),
        deploymentFee: Number(data.deployment_fee ?? 0),
    };
}

export function toBillingEgg({ attributes: data }: FractalResponseData): BillingEgg {
    return { id: data.id, uuid: data.uuid, name: data.name };
}

export function toDiscountCode({ attributes: data }: FractalResponseData): DiscountCode {
    return {
        code: data.code,
        description: data.description,
        type: data.type,
        value: Number(data.value),
    };
}

export function toInvoice({ attributes: data }: FractalResponseData): Invoice {
    return {
        id: data.id,
        number: data.number ?? null,
        generatedAt: data.generated_at ? new Date(data.generated_at) : null,
    };
}

export function toOrder({ attributes: data }: FractalResponseData): Order {
    const { server, invoice } = (data.relationships ?? {}) as Record<string, FractalResponseData | null | undefined>;

    return {
        id: data.id,
        name: data.name,
        description: data.description,
        total: Number(data.total),
        status: data.status,
        type: data.type,
        productId: data.product_id,
        serverId: data.server_id ?? null,
        metadata: data.metadata ?? null,
        createdAt: new Date(data.created_at),
        // Fractal renders a NullResource as `{ object: 'null_resource', attributes: null }`.
        server: server?.attributes ? toServer(server) : null,
        invoice: invoice?.attributes ? toInvoice(invoice) : null,
    };
}
