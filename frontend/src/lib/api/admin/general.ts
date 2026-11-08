import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';
import type { ActivityLog } from '$lib/api/definitions/account';
import { toActivityLog } from '$lib/api/transformers/account';
import type { PanelMode } from '$types/bootstrap';

/**
 * Admin "general" endpoints under `/api/application`, ported from
 * `api/routes/admin/{getMetrics,getVersion,settings,apiKeys,webhooks,activity}.ts`.
 * Each route checks its own admin permission, so a role without it gets a 403.
 */

// --- Overview ---------------------------------------------------------------

export interface MetricData {
    nodes: number;
    servers: { total: number; suspended: number; installing: number };
    users: { total: number; admins: number };
    databases: number;
    backups: number;
    tickets: number;
    /** Only present while the billing module is enabled. */
    billing?: { revenue: number; orders_pending: number; orders_this_month: number; products: number };
}

export interface VersionData {
    panel: { current: string; latest: string };
    wings: { latest: string };
    git: string | null;
}

export async function getMetrics(): Promise<MetricData> {
    const { data } = await http.get('/api/application/overview/metrics');

    return data;
}

export async function getVersion(): Promise<VersionData> {
    const { data } = await http.get('/api/application/overview/version');

    return data;
}

// --- Activity ---------------------------------------------------------------

export interface ActivitySubject {
    /** Morph alias, e.g. `server`, `user`, `node`. */
    type: string;
    id: number;
    identifier: string | null;
}

export type AdminActivityLog = ActivityLog & {
    /** Database row id; the `id` field is a sha1 of it. */
    logId: number | null;
    subjects: ActivitySubject[];
    /** Admin users carry their numeric id, which links to their admin page. */
    actorId: number | null;
};

export type AdminActivityQuery = QueryBuilderParams<'actor' | 'subject' | 'event' | 'ip', 'timestamp' | 'event'>;

export async function getAdminActivity(params: AdminActivityQuery = {}): Promise<PaginatedResult<AdminActivityLog>> {
    const { data } = await http.get('/api/application/activity', {
        params: { ...withQueryBuilderParams(params), include: 'actor' },
    });

    return {
        items: (data as FractalPaginatedResponse).data.map(item => {
            const actor = item.attributes.relationships?.actor as FractalResponseData | null | undefined;

            return {
                ...toActivityLog(item),
                logId: item.attributes.log_id ?? null,
                subjects: item.attributes.subjects ?? [],
                actorId: actor?.attributes?.id ?? null,
            };
        }),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

// --- Settings ---------------------------------------------------------------

export interface GeneralSettings {
    name: string;
    logo: string | null;
    auto_update: boolean;
    indicators: boolean;
    speed_dial: boolean;
    activity: { enabled: { account: boolean; server: boolean; admin: boolean } };
}

export async function updateGeneralSettings(settings: GeneralSettings): Promise<void> {
    await http.patch('/api/application/settings', {
        'app:name': settings.name,
        // The rule is `nullable|url`, so an empty field has to go up as null.
        'app:logo': settings.logo || null,
        'app:auto_update': settings.auto_update,
        'app:indicators': settings.indicators,
        'app:speed_dial': settings.speed_dial,
        'activity:enabled:account': settings.activity.enabled.account,
        'activity:enabled:server': settings.activity.enabled.server,
        'activity:enabled:admin': settings.activity.enabled.admin,
    });
}

/**
 * The legacy client sent the bare mode string as the body, which Laravel cannot read as
 * `mode`; the request rule is `nullable`, so the save "succeeded" and stored null. The
 * field is sent by name here.
 */
export async function updateMode(mode: NonNullable<PanelMode>): Promise<void> {
    await http.patch('/api/application/settings/mode', { mode });
}

export interface LogFile {
    name: string;
    size: number;
    modifiedAt: Date;
    errors: number;
    warnings: number;
}

export async function getLogFiles(): Promise<LogFile[]> {
    const { data } = await http.get('/api/application/settings/debug');

    return (data.data ?? []).map(
        ({ attributes }: FractalResponseData): LogFile => ({
            name: attributes.name,
            size: attributes.size,
            modifiedAt: new Date(attributes.modified_at),
            errors: attributes.errors,
            warnings: attributes.warnings,
        }),
    );
}

async function downloadBlob(url: string, filename: string) {
    const { data } = await http.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(data as Blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 0);
}

export function downloadLogFile(name: string): Promise<void> {
    return downloadBlob(`/api/application/settings/debug/${encodeURIComponent(name)}`, name);
}

export function downloadLogArchive(): Promise<void> {
    return downloadBlob('/api/application/settings/debug/archive', `panel-logs-${new Date().toISOString().slice(0, 10)}.zip`);
}

// --- Webhooks ---------------------------------------------------------------

export interface WebhookEvent {
    id: number;
    key: string;
    description: string;
    enabled: boolean;
}

export async function getWebhookEvents(): Promise<WebhookEvent[]> {
    const { data } = await http.get('/api/application/webhooks');

    return (data.data ?? []).map(({ attributes }: FractalResponseData) => ({
        id: attributes.id,
        key: attributes.key,
        description: attributes.description,
        enabled: Boolean(attributes.enabled),
    }));
}

/** Stores `modules:webhooks:<key>`; the panel reads `enabled` and `url`. */
export async function updateWebhookSetting(key: 'enabled' | 'url', value: boolean | string): Promise<void> {
    await http.put('/api/application/webhooks', { key, value });
}

/** Toggles one event, or every event when `id` is omitted. */
export async function toggleWebhookEvent(enabled: boolean, id?: number): Promise<void> {
    await http.put('/api/application/webhooks/toggle', { id, enabled });
}

export async function sendWebhookTest(): Promise<void> {
    await http.post('/api/application/webhooks/test');
}

// --- Application API keys ---------------------------------------------------

export interface ApplicationApiKey {
    id: number;
    identifier: string;
    description: string;
    createdAt: Date;
    lastUsedAt: Date | null;
}

export const API_KEY_RESOURCES = [
    'allocations',
    'database_hosts',
    'eggs',
    'locations',
    'nests',
    'nodes',
    'server_databases',
    'servers',
    'users',
] as const;

export type ApiKeyResource = (typeof API_KEY_RESOURCES)[number];

/** 0 none, 1 read, 2 read and write; the `r_*` columns on `api_keys`. */
export type ApiKeyPermissions = Record<`r_${ApiKeyResource}`, 0 | 1 | 2>;

export type ApiKeyQuery = QueryBuilderParams<'identifier', 'id' | 'identifier' | 'last_used_at'>;

export async function getApiKeys(params: ApiKeyQuery = {}): Promise<PaginatedResult<ApplicationApiKey>> {
    const { data } = await http.get('/api/application/api', { params: withQueryBuilderParams(params) });

    return {
        items: (data as FractalPaginatedResponse).data.map(({ attributes }) => ({
            id: attributes.id,
            identifier: attributes.identifier,
            description: attributes.description,
            createdAt: new Date(attributes.created_at),
            // The legacy transformer turned a null into the 1970 epoch.
            lastUsedAt: attributes.last_used_at ? new Date(attributes.last_used_at) : null,
        })),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

/** Returns the full token, which the backend never shows again. */
export async function createApiKey(memo: string, permissions: ApiKeyPermissions): Promise<string> {
    const { data } = await http.post('/api/application/api', { memo, permissions });

    return data.token;
}

export async function deleteApiKey(id: number): Promise<void> {
    await http.delete(`/api/application/api/${id}`);
}

// --- Setup wizard -----------------------------------------------------------

export interface SetupData {
    nodes: number;
    servers: number;
    users: number;
    eggs: number;
}

/** Row counts the wizard shows, to confirm data from an earlier install is present. Requires `overview.read`. */
export async function getSetupData(): Promise<SetupData> {
    const { data } = await http.get('/api/application/setup/data');

    return data;
}

/** Stores `settings::app:setup`; the wizard stops showing after the next page load. */
export async function finishSetup(): Promise<void> {
    await http.post('/api/application/setup/finish');
}
