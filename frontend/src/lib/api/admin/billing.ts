import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';
import type { OrderStatus, OrderType } from '$lib/api/definitions/billing';

/**
 * Admin billing endpoints, ported from `api/routes/admin/billing.ts`, plus the nest/egg
 * lookups the category form needs.
 */

export const adminBillingKeys = {
    all: ['admin', 'billing'] as const,
    analytics: ['admin', 'billing', 'analytics'] as const,
    categories: ['admin', 'billing', 'categories'] as const,
    category: (id: number) => ['admin', 'billing', 'categories', id] as const,
    products: (categoryId: number) => ['admin', 'billing', 'categories', categoryId, 'products'] as const,
    product: (id: number) => ['admin', 'billing', 'products', id] as const,
    orders: ['admin', 'billing', 'orders'] as const,
    invoices: ['admin', 'billing', 'invoices'] as const,
    exceptions: ['admin', 'billing', 'exceptions'] as const,
    discountCodes: ['admin', 'billing', 'discount-codes'] as const,
    paymentMethods: ['admin', 'billing', 'payment-methods'] as const,
};

const list = async <T>(url: string, params: QueryBuilderParams, map: (d: FractalResponseData) => T): Promise<PaginatedResult<T>> => {
    const { data } = await http.get(url, { params: withQueryBuilderParams(params) });

    return {
        items: (data as FractalPaginatedResponse).data.map(map),
        pagination: getPaginationSet(data.meta.pagination),
    };
};

// --- Settings ---------------------------------------------------------------

/**
 * Stores `settings::modules:billing:<key>`. The request has no validation rules, so any
 * key is accepted; these are the ones the panel reads.
 */
export type BillingSettingKey =
    | 'enabled'
    | 'allow_upgrades'
    | 'currency:code'
    | 'currency:symbol'
    | 'keys:secret'
    | 'links:terms'
    | 'links:privacy'
    | 'renewal:days'
    | 'renewal:threshold';

export async function updateBillingSetting(key: BillingSettingKey, value: boolean | string | number | null): Promise<void> {
    await http.put('/api/application/billing/settings', { key, value });
}

/** Forgets `keys:secret`. Purchasing and renewing stop working until a new key is saved. */
export async function deleteStripeKeys(): Promise<void> {
    await http.delete('/api/application/billing/keys');
}

// --- Payment channels -------------------------------------------------------

export type PaymentChannelId = 'stripe' | 'epay' | 'creem' | 'waffo' | 'waffo_pancake';

export interface PaymentChannel {
    id: PaymentChannelId;
    label: string;
    description: string;
    /** Whether every credential this channel needs has been filled in. */
    configured: boolean;
    /** The settings keys the channel needs before it can be used. */
    required_keys: string[];
    /** The keys that hold a secret and are never sent to the browser. */
    secret_keys: string[];
    /** The keys that are not secret. */
    public_keys: string[];
    /** Whether the channel notifies the panel when a payment settles. */
    uses_callbacks: boolean;
    /** The address to paste into the gateway's dashboard, when it notifies the panel. */
    callback_url: string | null;
}

export interface PaymentChannels {
    channels: PaymentChannel[];
}

/** The payment channels, with whether each one is configured. */
export async function getPaymentChannels(): Promise<PaymentChannels> {
    const { data } = await http.get('/api/application/billing/channels');

    return data as PaymentChannels;
}

/** Stores the credentials of a channel. */
export async function updatePaymentChannel(channel: PaymentChannelId, values: Record<string, string>): Promise<void> {
    await http.put('/api/application/billing/channels', { channel, ...values });
}

/** Forgets the credentials of a channel. */
export async function deletePaymentChannel(channel: PaymentChannelId): Promise<void> {
    await http.delete('/api/application/billing/channels', { data: { channel } });
}

// --- Payment methods --------------------------------------------------------

export interface AdminPaymentMethod {
    id: number;
    uuid: string;
    /** The identifier that decides the flow, e.g. `stripe` or `epay:wxpay`. */
    identifier: string;
    name: string;
    icon: string | null;
    description: string | null;
    enabled: boolean;
    sort: number;
    /** The channel the method pays through, without the method part. */
    channel: PaymentChannelId;
    createdAt: Date;
}

export interface PaymentMethodValues {
    identifier: string;
    name: string;
    icon: string | null;
    description: string | null;
    enabled: boolean;
    sort: number;
}

const toPaymentMethod = ({ attributes: a }: FractalResponseData): AdminPaymentMethod => ({
    id: a.id,
    uuid: a.uuid,
    identifier: a.identifier,
    name: a.name,
    icon: a.icon || null,
    description: a.description || null,
    enabled: Boolean(a.enabled),
    sort: Number(a.sort ?? 0),
    channel: a.channel,
    createdAt: new Date(a.created_at),
});

export type PaymentMethodQuery = QueryBuilderParams<'identifier' | 'name', 'id' | 'identifier' | 'name' | 'sort' | 'created_at'>;

export const getPaymentMethods = (params: PaymentMethodQuery = {}) =>
    list('/api/application/billing/payment-methods', params, toPaymentMethod);

export async function createPaymentMethod(values: PaymentMethodValues): Promise<AdminPaymentMethod> {
    const { data } = await http.post('/api/application/billing/payment-methods', values);

    return toPaymentMethod(data);
}

export async function updatePaymentMethod(id: number, values: PaymentMethodValues): Promise<AdminPaymentMethod> {
    const { data } = await http.patch(`/api/application/billing/payment-methods/${id}`, values);

    return toPaymentMethod(data);
}

export async function deletePaymentMethod(id: number): Promise<void> {
    await http.delete(`/api/application/billing/payment-methods/${id}`);
}

// --- Categories -------------------------------------------------------------

export interface AdminCategory {
    id: number;
    uuid: string;
    name: string;
    icon: string | null;
    description: string | null;
    visible: boolean;
    nestId: number;
    /** Null when customers pick any egg in the nest at checkout. */
    eggId: number | null;
    createdAt: Date;
}

export interface CategoryValues {
    name: string;
    icon: string | null;
    description: string | null;
    visible: boolean;
    nestId: number;
    eggId: number | null;
}

const toCategory = ({ attributes: a }: FractalResponseData): AdminCategory => ({
    id: a.id,
    uuid: a.uuid,
    name: a.name,
    icon: a.icon || null,
    description: a.description || null,
    visible: Boolean(a.visible),
    nestId: a.nest_id,
    eggId: a.egg_id ?? null,
    createdAt: new Date(a.created_at),
});

export type CategoryQuery = QueryBuilderParams<'name', 'id' | 'name' | 'created_at' | 'visible'>;

export const getCategories = (params: CategoryQuery = {}) => list('/api/application/billing/categories', params, toCategory);

export async function getCategory(id: number): Promise<AdminCategory> {
    const { data } = await http.get(`/api/application/billing/categories/${id}`);

    return toCategory(data);
}

export async function createCategory(values: CategoryValues): Promise<AdminCategory> {
    const { data } = await http.post('/api/application/billing/categories', values);

    return toCategory(data);
}

export async function updateCategory(id: number, values: CategoryValues): Promise<void> {
    await http.patch(`/api/application/billing/categories/${id}`, values);
}

/** Force-deletes the category and every product in it. */
export async function deleteCategory(id: number): Promise<void> {
    await http.delete(`/api/application/billing/categories/${id}`);
}

// --- Products ---------------------------------------------------------------

export interface ProductLimits {
    cpu: number;
    memory: number;
    disk: number;
    backup: number;
    database: number;
    allocation: number;
}

export interface AdminProduct {
    id: number;
    uuid: string;
    categoryUuid: string;
    name: string;
    icon: string | null;
    price: number;
    description: string | null;
    /** The product id the payment gateway knows this product by. */
    externalId: string | null;
    limits: ProductLimits;
    createdAt: Date;
}

export interface ProductValues {
    name: string;
    icon: string | null;
    price: number;
    description: string | null;
    /** The product id the payment gateway knows this product by. */
    externalId?: string | null;
    limits: ProductLimits;
}

const toProduct = ({ attributes: a }: FractalResponseData): AdminProduct => ({
    id: a.id,
    uuid: a.uuid,
    categoryUuid: a.category_uuid,
    name: a.name,
    icon: a.icon || null,
    price: Number(a.price),
    description: a.description || null,
    externalId: a.external_id || null,
    limits: a.limits,
    createdAt: new Date(a.created_at),
});

export type ProductQuery = QueryBuilderParams<'name', 'id' | 'name' | 'price'>;

export const getProducts = (categoryId: number, params: ProductQuery = {}) =>
    list(`/api/application/billing/categories/${categoryId}/products`, params, toProduct);

export async function getProduct(id: number): Promise<AdminProduct> {
    const { data } = await http.get(`/api/application/billing/products/${id}`);

    return toProduct(data);
}

export async function createProduct(categoryId: number, values: ProductValues): Promise<AdminProduct> {
    const { data } = await http.post(`/api/application/billing/categories/${categoryId}/products`, productBody(values));

    return toProduct(data);
}

export async function updateProduct(categoryId: number, productId: number, values: ProductValues): Promise<void> {
    await http.patch(`/api/application/billing/categories/${categoryId}/products/${productId}`, productBody(values));
}

/**
 * The request body for a product. The API names its fields in snake_case, while the
 * form works in camelCase.
 */
function productBody(values: ProductValues) {
    return {
        ...values,
        external_id: values.externalId ?? null,
        externalId: undefined,
    };
}

export async function deleteProduct(categoryId: number, productId: number): Promise<void> {
    await http.delete(`/api/application/billing/categories/${categoryId}/products/${productId}`);
}

// --- Orders -----------------------------------------------------------------

export interface AdminOrder {
    id: number;
    name: string;
    userId: number;
    description: string;
    total: number;
    status: OrderStatus;
    productId: number;
    type: OrderType | '?';
    /** -1 while the threat check is still running. */
    threatIndex: number;
    createdAt: Date;
}

const toOrder = (a: Record<string, any>): AdminOrder => ({
    id: a.id,
    name: a.name,
    userId: a.user_id,
    description: a.description,
    total: Number(a.total),
    status: a.status,
    productId: a.product_id,
    type: a.type,
    threatIndex: a.threat_index,
    createdAt: new Date(a.created_at),
});

/** OrderController only allows these sorts; the legacy table also offered `type`, which returns 400. */
export type OrderQuery = QueryBuilderParams<'description' | 'server_id', 'id' | 'total' | 'created_at' | 'threat_index'>;

export const getOrders = (params: OrderQuery = {}) =>
    list('/api/application/billing/orders', params, ({ attributes }) => toOrder(attributes));

// --- Analytics --------------------------------------------------------------

export interface BillingAnalytics {
    orders: AdminOrder[];
    categoryCount: number;
    productCount: number;
}

/** Returns every order, category and product as raw models (not Fractal). */
export async function getBillingAnalytics(): Promise<BillingAnalytics> {
    const { data } = await http.get('/api/application/billing/analytics');

    return {
        orders: (data.orders ?? []).map(toOrder),
        categoryCount: (data.categories ?? []).length,
        productCount: (data.products ?? []).length,
    };
}

// --- Invoices ---------------------------------------------------------------

export interface AdminInvoice {
    id: number;
    number: string | null;
    orderId: number;
    total: number | null;
    status: OrderStatus | null;
    user: { id: number | null; username: string | null; email: string | null };
    generatedAt: Date | null;
}

const toInvoice = ({ attributes: a }: FractalResponseData): AdminInvoice => ({
    id: a.id,
    number: a.number ?? null,
    orderId: a.order_id,
    total: a.total === null || a.total === undefined ? null : Number(a.total),
    status: a.status ?? null,
    user: a.user,
    generatedAt: a.generated_at ? new Date(a.generated_at) : null,
});

export type InvoiceQuery = QueryBuilderParams<'number' | 'user' | 'status', 'number' | 'generated_at'>;

export const getInvoices = (params: InvoiceQuery = {}) => list('/api/application/billing/invoices', params, toInvoice);

export async function downloadInvoice(id: number, filename: string): Promise<void> {
    const { data } = await http.get(`/api/application/billing/invoices/${id}/download`, { responseType: 'blob' });
    saveBlob(data, filename);
}

// --- Discount codes ---------------------------------------------------------

export type DiscountCodeType = 'percentage' | 'numeric';

export interface AdminDiscountCode {
    id: number;
    code: string;
    description: string;
    type: DiscountCodeType;
    value: number;
    /** Remaining uses; null or -1 is unlimited, 0 means used up (`hasUsesRemaining`). */
    uses: number | null;
    active: boolean;
    /** `YYYY-MM-DD`, the column is cast to a date. */
    expiresAt: string | null;
    createdAt: Date;
}

export interface DiscountCodeValues {
    code: string;
    description: string;
    type: DiscountCodeType;
    value: number;
    uses: number | null;
    active: boolean;
    expires_at: string | null;
}

const toDiscountCode = ({ attributes: a }: FractalResponseData): AdminDiscountCode => ({
    id: a.id,
    code: a.code,
    description: a.description,
    type: a.type,
    value: a.value,
    uses: a.uses ?? null,
    // Older backends omit `active`; codes are active unless explicitly turned off.
    active: a.active ?? true,
    expiresAt: a.expires_at ? String(a.expires_at).slice(0, 10) : null,
    createdAt: new Date(a.created_at),
});

export type DiscountCodeQuery = QueryBuilderParams<'code', 'id' | 'code' | 'value' | 'uses' | 'expires_at' | 'created_at'>;

export const getDiscountCodes = (params: DiscountCodeQuery = {}) =>
    list('/api/application/billing/discount-codes', params, toDiscountCode);

export async function createDiscountCode(values: DiscountCodeValues): Promise<AdminDiscountCode> {
    const { data } = await http.post('/api/application/billing/discount-codes', values);

    return toDiscountCode(data);
}

export async function updateDiscountCode(id: number, values: DiscountCodeValues): Promise<AdminDiscountCode> {
    const { data } = await http.patch(`/api/application/billing/discount-codes/${id}`, values);

    return toDiscountCode(data);
}

export async function deleteDiscountCode(id: number): Promise<void> {
    await http.delete(`/api/application/billing/discount-codes/${id}`);
}

// --- Exceptions -------------------------------------------------------------

export type BillingExceptionType = 'deployment' | 'payment' | 'storefront';

export interface BillingException {
    id: number;
    uuid: string;
    title: string;
    description: string;
    type: BillingExceptionType;
    orderId: number | null;
    createdAt: Date;
}

const toException = ({ attributes: a }: FractalResponseData): BillingException => ({
    id: a.id,
    uuid: a.uuid,
    title: a.title,
    description: a.description,
    type: a.exception_type,
    orderId: a.order_id ?? null,
    createdAt: new Date(a.created_at),
});

export type ExceptionQuery = QueryBuilderParams<'title', 'id' | 'exception_type' | 'created_at'>;

export const getBillingExceptions = (params: ExceptionQuery = {}) =>
    list('/api/application/billing/exceptions', params, toException);

/** Resolving deletes the exception row. */
export async function resolveBillingException(uuid: string): Promise<void> {
    await http.delete(`/api/application/billing/exceptions/${uuid}`);
}

export async function resolveAllBillingExceptions(): Promise<void> {
    await http.delete('/api/application/billing/exceptions');
}

// --- Config import/export ---------------------------------------------------

/**
 * The legacy client passed `{ responseType: 'blob' }` as the POST body by mistake, so the
 * response was parsed as JSON and re-serialised; this does the same on purpose.
 */
export async function exportBillingConfig(): Promise<void> {
    const { data } = await http.post('/api/application/billing/config/export');
    saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'data.json');
}

/** With `override`, every category and product is deleted first and duplicates are not checked. */
export async function importBillingConfig(data: object, override: boolean, ignoreDuplicates: boolean): Promise<void> {
    await http.post('/api/application/billing/config/import', { data, override, ignore_duplicates: ignoreDuplicates });
}

// --- Nests / eggs (category form) -------------------------------------------

export interface NestOption {
    id: number;
    name: string;
}

/** The legacy select only read the first page (50). Nests are few, so one page of 100 covers them. */
export async function getNestOptions(): Promise<NestOption[]> {
    const { data } = await http.get('/api/application/nests', { params: { per_page: 100 } });

    return (data as FractalPaginatedResponse).data.map(({ attributes: a }) => ({ id: a.id, name: a.name }));
}

export async function getEggOptions(nestId: number): Promise<NestOption[]> {
    const { data } = await http.get(`/api/application/nests/${nestId}/eggs`, { params: { per_page: 100 } });

    return (data as FractalPaginatedResponse).data.map(({ attributes: a }) => ({ id: a.id, name: a.name }));
}

function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
