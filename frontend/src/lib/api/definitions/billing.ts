import type { Server } from '$lib/api/definitions/server';

/**
 * Billing models, ported from `api/definitions/account/billing/models.d.ts`.
 *
 * Money values are plain numbers in the store currency's major unit; the backend
 * converts to cents only when it builds the Stripe line items.
 */

export interface Category {
    id: number;
    name: string;
    icon: string | null;
    description: string | null;
}

export interface Product {
    id: number;
    name: string;
    icon: string | null;
    price: number;
    description: string | null;
    /** Null when the category leaves the egg to the customer at checkout. */
    eggId: number | null;
    limits: {
        cpu: number;
        /** MiB */
        memory: number;
        /** MiB */
        disk: number;
        backup: number;
        database: number;
        allocation: number;
    };
}

export interface BillingNode {
    id: number;
    name: string;
    fqdn: string;
    deployable: boolean;
    deployableFree: boolean;
    deploymentFee: number;
}

export interface BillingEgg {
    id: number;
    uuid: string;
    name: string;
}

/**
 * Where the customer is sent to pay.
 *
 * Most gateways are reached by following a URL. The Epay protocol instead hands the
 * gateway a set of signed fields, which are submitted as a form — the gateway reads
 * them from the form body, from the query string, or from either.
 */
export interface CheckoutTarget {
    url: string;
    /** `POST` when the signed fields have to be submitted as a form. */
    method: 'GET' | 'POST';
    params: Record<string, string>;
}

/**
 * A way the customer can pay. The identifier decides the flow, so it is what the
 * checkout sends back: `stripe` is Stripe itself, `epay:wxpay` is the WeChat Pay
 * method of the Epay channel.
 */
export interface PaymentMethod {
    id: number;
    identifier: string;
    name: string;
    icon: string | null;
    description: string | null;
}

export interface DiscountCode {
    code: string;
    description: string;
    type: 'percentage' | 'numeric';
    value: number;
}

export type OrderStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'expired';
export type OrderType = 'new' | 'renewal' | 'upgrade';

export interface Invoice {
    id: number;
    number: string | null;
    generatedAt: Date | null;
}

export interface Order {
    id: number;
    name: string;
    description: string;
    total: number;
    status: OrderStatus;
    type: OrderType;
    productId: number;
    serverId: number | null;
    metadata: { deployment_fee?: number; discount_code?: string; subtotal?: number } | null;
    createdAt: Date;
    server: Server | null;
    invoice: Invoice | null;
}

/** One custom environment value sent with an order, as the deployment services expect it. */
export interface OrderVariable {
    key: string;
    value: string;
}
