import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseList,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';
import type {
    BillingEgg,
    BillingNode,
    Category,
    DiscountCode,
    Order,
    OrderVariable,
    Product,
} from '$lib/api/definitions/billing';
import type { EggVariable, Server } from '$lib/api/definitions/server';
import { toEggVariable, toServer } from '$lib/api/transformers/server';
import {
    toBillingEgg,
    toBillingNode,
    toCategory,
    toDiscountCode,
    toOrder,
    toProduct,
} from '$lib/api/transformers/billing';

/**
 * Billing endpoints under `/api/client/billing`, ported from `api/routes/account/billing/*`.
 * Every route here sits behind the `BillingEnabled` middleware and returns 403 when the
 * module is off.
 */

export const billingKeys = {
    categories: ['billing', 'categories'] as const,
    products: (categoryId: number) => ['billing', 'categories', categoryId, 'products'] as const,
    product: (id: number) => ['billing', 'products', id] as const,
    nodes: (productId: number) => ['billing', 'products', productId, 'nodes'] as const,
    eggs: (productId: number) => ['billing', 'products', productId, 'eggs'] as const,
    variables: (eggId: number) => ['billing', 'eggs', eggId, 'variables'] as const,
    orders: ['billing', 'orders'] as const,
};

const list = <T>(data: FractalResponseList, map: (d: any) => T): T[] => (data.data ?? []).map(map);

export async function getCategories(): Promise<Category[]> {
    const { data } = await http.get('/api/client/billing/categories');

    return list(data, toCategory);
}

export async function getProducts(categoryId: number): Promise<Product[]> {
    const { data } = await http.get(`/api/client/billing/categories/${categoryId}`);

    return list(data, toProduct);
}

export async function getProduct(id: number): Promise<Product> {
    const { data } = await http.get(`/api/client/billing/products/${id}`);

    return toProduct(data);
}

/**
 * Nodes a product can deploy to. The backend contacts each node's daemon to check it is
 * online, so this can be slow; it is a POST in the existing API.
 */
export async function getViableNodes(productId: number): Promise<BillingNode[]> {
    const { data } = await http.post(`/api/client/billing/nodes/${productId}`);

    return list(data, toBillingNode);
}

/** Eggs in the product's nest, for categories that let the customer pick one. */
export async function getProductEggs(productId: number): Promise<BillingEgg[]> {
    const { data } = await http.get(`/api/client/billing/products/${productId}/eggs`);

    return list(data, toBillingEgg);
}

/**
 * User-viewable variables of an egg. The route is `/products/{egg:id}/variables`: despite
 * the path, the id bound is an egg id.
 */
export async function getEggVariables(eggId: number): Promise<EggVariable[]> {
    const { data } = await http.get(`/api/client/billing/products/${eggId}/variables`);

    return list(data, toEggVariable);
}

export async function validateDiscountCode(code: string): Promise<DiscountCode> {
    const { data } = await http.post('/api/client/billing/discount-codes', { discount_code: code });

    return toDiscountCode(data);
}

export interface CheckoutRequest {
    productId: number;
    /**
     * Omit for renewals. The backend validates it with `exists:nodes,id`, so a placeholder
     * such as 0 fails validation instead of selecting the renewal path.
     */
    nodeId?: number;
    eggId?: number;
    variables: OrderVariable[];
    discountCode?: string;
    /**
     * Set for renewals and upgrades: the backend binds the order to an existing server
     * instead of deploying a new one. (`server_id` in the request body.)
     */
    serverId?: number;
}

/** Creates a Stripe Checkout session and returns the hosted payment page URL. */
export async function createCheckoutSession(req: CheckoutRequest): Promise<string> {
    const { data } = await http.post('/api/client/billing/stripe/create', {
        product_id: req.productId,
        node_id: req.nodeId,
        egg_id: req.eggId,
        variables: req.variables,
        server_id: req.serverId,
        // Omitted rather than null: the backend only applies a discount when the key exists.
        ...(req.discountCode ? { discount_code: req.discountCode } : {}),
    });

    return data as string;
}

/** Completes a paid order after Stripe redirects back, deploying the server. */
export async function processCheckoutSession(session: string): Promise<Server> {
    const { data } = await http.post('/api/client/billing/stripe/process', { session });

    return toServer(data);
}

/** Deploys a free product immediately, or renews one when `serverId` is set. */
export async function processFreeOrder(req: Omit<CheckoutRequest, 'discountCode'>): Promise<Server> {
    const { data } = await http.post('/api/client/billing/free/process', {
        product_id: req.productId,
        node_id: req.nodeId,
        egg_id: req.eggId,
        variables: req.variables,
        server_id: req.serverId,
    });

    return toServer(data);
}

export type OrderQuery = QueryBuilderParams<'id' | 'name' | 'server_id', 'id' | 'total' | 'type' | 'created_at'>;

export async function getOrders(params: OrderQuery = {}, perPage = 20): Promise<PaginatedResult<Order>> {
    const { data } = await http.get('/api/client/billing/orders', {
        params: { include: 'server,invoice', per_page: perPage, ...withQueryBuilderParams(params) },
    });

    return {
        items: (data as FractalPaginatedResponse).data.map(toOrder),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

/**
 * Server upgrades, ported from `api/routes/server/billing.ts`. These sit behind both the
 * billing and `allow_upgrades` middleware.
 */

/** Products in the server's category that cost more than its current one. */
export async function getUpgradeOptions(uuid: string): Promise<Product[]> {
    const { data } = await http.get(`/api/client/servers/${uuid}/upgrade`);

    return list(data, toProduct);
}

/** Pro-rata one-off charge for upgrading to `productId` before the next renewal. */
export async function getUpgradeCharge(uuid: string, productId: number): Promise<number> {
    const { data } = await http.post(`/api/client/servers/${uuid}/upgrade/charge`, { product_id: productId });

    return Number(data.charge);
}

/** Creates the Stripe Checkout session for an upgrade and returns its URL. */
export async function processUpgrade(uuid: string, productId: number): Promise<string> {
    const { data } = await http.post(`/api/client/servers/${uuid}/upgrade`, { product_id: productId });

    return data as string;
}

/** Downloads an order's PDF invoice through the session, then hands it to the browser. */
export async function downloadInvoice(orderId: number, filename: string): Promise<void> {
    const { data } = await http.get(`/api/client/billing/orders/${orderId}/invoice`, { responseType: 'blob' });

    const url = URL.createObjectURL(data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    // Revoke on the next tick so the download has started before the URL goes away.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
