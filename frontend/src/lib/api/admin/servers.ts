import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type FractalResponseList,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';
import type { ActivityLog } from '$lib/api/definitions/account';
import { toActivityLog } from '$lib/api/transformers/account';

/**
 * Admin server and preset endpoints, ported from `api/routes/admin/servers.ts`, plus the
 * nest/egg lookups the create and startup forms need.
 */

export const adminServerKeys = {
    all: ['admin', 'servers'] as const,
    server: (id: number) => ['admin', 'servers', id] as const,
    presets: ['admin', 'server-presets'] as const,
    preset: (id: number) => ['admin', 'server-presets', id] as const,
};

// --- Rows shown on the user and node pages --------------------------------

export interface ServerSummary {
    id: number;
    identifier: string;
    name: string;
    ownerId: number;
    nodeId: number;
    status: string | null;
    limits: { memory: number; disk: number; cpu: number };
}

export async function getServerSummaries(filter: { owner_id?: number; node_id?: number }, page = 1): Promise<PaginatedResult<ServerSummary>> {
    const params: Record<string, unknown> = { page };
    for (const [key, value] of Object.entries(filter)) params[`filter[${key}]`] = value;

    const { data } = await http.get('/api/application/servers', { params });

    return {
        items: (data as FractalPaginatedResponse).data.map(({ attributes: a }) => ({
            id: a.id,
            identifier: a.identifier,
            name: a.name,
            ownerId: a.owner_id,
            nodeId: a.node_id,
            status: a.status ?? null,
            limits: { memory: a.limits.memory, disk: a.limits.disk, cpu: a.limits.cpu },
        })),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

// --- Servers ----------------------------------------------------------------

export interface ServerAllocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
}

export const allocationText = (a: Pick<ServerAllocation, 'ip' | 'alias' | 'port'>) => `${a.alias ?? a.ip}:${a.port}`;

export interface ServerVariableValue {
    id: number;
    eggId: number;
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    /** Null until a value is stored for this server. */
    serverValue: string | null;
    rules: string;
}

export interface AdminServerListItem {
    id: number;
    uuid: string;
    identifier: string;
    name: string;
    status: string | null;
    owner: { id: number; email: string; username: string } | null;
    node: { id: number; name: string; fqdn: string } | null;
}

export interface AdminServer {
    id: number;
    uuid: string;
    identifier: string;
    externalId: string | null;
    name: string;
    description: string;
    status: string | null;
    ownerId: number;
    owner: { id: number; uuid: string; username: string; email: string; avatarUrl: string | null } | null;
    nodeId: number;
    node: { id: number; name: string; fqdn: string; scheme: string } | null;
    allocationId: number;
    allocations: ServerAllocation[];
    nestId: number;
    eggId: number;
    limits: { memory: number; swap: number; disk: number; io: number; cpu: number; threads: string | null; oomKiller: boolean };
    featureLimits: { allocations: number; backups: number; databases: number; subusers: number };
    container: { startup: string | null; image: string };
    variables: ServerVariableValue[];
    billingProductId: number | null;
    renewalDate: Date | null;
}

const rel = (a: Record<string, any>, key: string) => a.relationships?.[key] as FractalResponseData | FractalResponseList | null | undefined;
const item = (r: FractalResponseData | FractalResponseList | null | undefined) =>
    r && !('data' in r) && r.object !== 'null_resource' ? r.attributes : null;
const list = (r: FractalResponseData | FractalResponseList | null | undefined) => (r && 'data' in r ? r.data.map(d => d.attributes) : []);

const toListItem = ({ attributes: a }: FractalResponseData): AdminServerListItem => {
    const user = item(rel(a, 'user'));
    const node = item(rel(a, 'node'));

    return {
        id: a.id,
        uuid: a.uuid,
        identifier: a.identifier,
        name: a.name,
        status: a.status ?? null,
        owner: user ? { id: user.id, email: user.email, username: user.username } : null,
        node: node ? { id: node.id, name: node.name, fqdn: node.fqdn } : null,
    };
};

const toServer = ({ attributes: a }: FractalResponseData): AdminServer => {
    const user = item(rel(a, 'user'));
    const node = item(rel(a, 'node'));

    return {
        id: a.id,
        uuid: a.uuid,
        identifier: a.identifier,
        externalId: a.external_id ?? null,
        name: a.name,
        description: a.description ?? '',
        status: a.status ?? null,
        ownerId: a.owner_id,
        owner: user ? { id: user.id, uuid: user.uuid, username: user.username, email: user.email, avatarUrl: user.avatar_url ?? null } : null,
        nodeId: a.node_id,
        node: node ? { id: node.id, name: node.name, fqdn: node.fqdn, scheme: node.scheme } : null,
        allocationId: a.allocation_id,
        allocations: list(rel(a, 'allocations')).map(x => ({ id: x.id, ip: x.ip, alias: x.alias || null, port: x.port })),
        nestId: a.nest_id,
        eggId: a.egg_id,
        limits: {
            memory: a.limits.memory,
            swap: a.limits.swap,
            disk: a.limits.disk,
            io: a.limits.io,
            cpu: a.limits.cpu,
            threads: a.limits.threads ?? null,
            oomKiller: Boolean(a.limits.oom_killer),
        },
        featureLimits: {
            allocations: a.feature_limits.allocations ?? 0,
            backups: a.feature_limits.backups ?? 0,
            databases: a.feature_limits.databases ?? 0,
            subusers: a.feature_limits.subusers ?? 0,
        },
        container: { startup: a.container.startup ?? null, image: a.container.image },
        variables: list(rel(a, 'variables')).map(v => ({
            id: v.id,
            eggId: v.egg_id,
            name: v.name,
            description: v.description ?? '',
            envVariable: v.env_variable,
            defaultValue: v.default_value ?? '',
            serverValue: v.server_value ?? null,
            rules: v.rules ?? '',
        })),
        billingProductId: a.billing_product_id ?? null,
        renewalDate: a.renewal_date ? new Date(a.renewal_date) : null,
    };
};

export type ServerQuery = QueryBuilderParams<'name' | 'uuidShort' | 'owner_id' | 'node_id', 'id' | 'uuidShort' | 'name' | 'owner_id' | 'node_id' | 'status'>;

export async function getServers(params: ServerQuery = {}): Promise<PaginatedResult<AdminServerListItem>> {
    const { data } = await http.get('/api/application/servers', { params: { ...withQueryBuilderParams(params), include: 'user,node' } });

    return { items: (data as FractalPaginatedResponse).data.map(toListItem), pagination: getPaginationSet(data.meta.pagination) };
}

export async function getServer(id: number): Promise<AdminServer> {
    const { data } = await http.get(`/api/application/servers/${id}`, { params: { include: 'allocations,user,node,variables' } });

    return toServer(data);
}

export interface CreateServerValues {
    external_id: string | null;
    name: string;
    description: string | null;
    owner_id: number;
    node_id: number;
    limits: { memory: number; swap: number; disk: number; io: number; cpu: number; threads: string | null; oom_killer: boolean };
    feature_limits: { allocations: number; backups: number; databases: number; subusers: number };
    allocation: { default: number; additional: number[] };
    startup: string;
    environment: Record<string, string>;
    egg_id: number;
    image: string;
    skip_scripts: boolean;
    start_on_completion: boolean;
}

/**
 * The legacy form posted `externalId` (camel case), which StoreServerRequest ignores, so
 * an external ID set at creation was dropped. Snake case keys are used throughout here.
 */
export async function createServer(values: CreateServerValues): Promise<{ id: number }> {
    const { data } = await http.post('/api/application/servers', values);

    return { id: data.attributes.id };
}

export interface UpdateServerValues {
    external_id: string | null;
    name: string;
    description: string;
    owner_id: number;
    limits: { memory: number; swap: number; disk: number; io: number; cpu: number; threads: string | null; oom_killer: boolean };
    feature_limits: { allocations: number; backups: number; databases: number; subusers: number };
    allocation_id: number;
    add_allocations: number[];
    remove_allocations: number[];
    /** Only sent from the billing tab; leaving them out keeps the stored values. */
    renewal_date?: string | null;
    billing_product_id?: number | null;
}

export async function updateServer(id: number, values: UpdateServerValues): Promise<void> {
    await http.patch(`/api/application/servers/${id}`, values);
}

/** The full update body for `server` as stored, for saves that change one area only. */
export const currentServerValues = (s: AdminServer): UpdateServerValues => ({
    external_id: s.externalId,
    name: s.name,
    description: s.description,
    owner_id: s.ownerId,
    limits: {
        memory: s.limits.memory,
        swap: s.limits.swap,
        disk: s.limits.disk,
        io: s.limits.io,
        cpu: s.limits.cpu,
        threads: s.limits.threads,
        oom_killer: s.limits.oomKiller,
    },
    feature_limits: { ...s.featureLimits },
    allocation_id: s.allocationId,
    add_allocations: [],
    remove_allocations: [],
});

export interface StartupValues {
    startup: string;
    environment: Record<string, string>;
    egg_id: number;
    image: string;
    skip_scripts: boolean;
}

export async function updateServerStartup(id: number, values: StartupValues): Promise<void> {
    await http.patch(`/api/application/servers/${id}/startup`, values);
}

/** Without `force`, a Wings error other than 404 aborts the delete. */
export async function deleteServer(id: number, force: boolean): Promise<void> {
    await http.post(`/api/application/servers/${id}/delete`, { force });
}

export const reinstallServer = (id: number) => http.post(`/api/application/servers/${id}/reinstall`).then(() => undefined);
export const suspendServer = (id: number) => http.post(`/api/application/servers/${id}/suspend`).then(() => undefined);
export const unsuspendServer = (id: number) => http.post(`/api/application/servers/${id}/unsuspend`).then(() => undefined);
/** Flips between installed and installing; refused for a failed install. */
export const toggleInstallStatus = (id: number) => http.post(`/api/application/servers/${id}/toggle`).then(() => undefined);

export async function transferServer(id: number, values: { node_id: number; allocation_id: number; additional_allocations?: number[] }): Promise<void> {
    await http.post(`/api/application/servers/${id}/transfer`, values);
}

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

/** Servers that are installing, suspended or transferring are skipped by the backend. */
export async function bulkPower(ids: number[], action: PowerAction): Promise<{ total: number; failed: { server: number; message: string }[] }> {
    const { data } = await http.post('/api/application/servers/bulk/power', { servers: ids, action });

    return data;
}

export type ServerActivityQuery = QueryBuilderParams<'event' | 'ip', 'timestamp' | 'event'>;

/** Requires `activity.read`. */
export async function getServerActivity(id: number, params: ServerActivityQuery = {}): Promise<PaginatedResult<ActivityLog>> {
    const { data } = await http.get(`/api/application/servers/${id}/activity`, { params: { ...withQueryBuilderParams(params), include: 'actor' } });

    return { items: (data as FractalPaginatedResponse).data.map(toActivityLog), pagination: getPaginationSet(data.meta.pagination) };
}

export interface ServerDatabaseRow {
    id: number;
    database: string;
    username: string;
    remote: string;
    hostId: number;
    maxConnections: number | null;
}

export async function getServerDatabases(id: number): Promise<ServerDatabaseRow[]> {
    const { data } = await http.get(`/api/application/servers/${id}/databases`);

    return (data as FractalResponseList).data.map(({ attributes: a }) => ({
        id: a.id,
        database: a.name,
        username: a.username,
        remote: a.remote,
        hostId: a.database_host_id,
        maxConnections: a.max_connections ?? null,
    }));
}

// --- Free allocations on a node --------------------------------------------

export async function getFreeAllocations(nodeId: number, search = ''): Promise<ServerAllocation[]> {
    const { data } = await http.get(`/api/application/nodes/${nodeId}/allocations`, {
        params: { 'filter[server_id]': '0', ...(search ? { 'filter[search]': search } : {}), per_page: 100, sort: 'port' },
    });

    return (data as FractalPaginatedResponse).data.map(({ attributes: x }) => ({ id: x.id, ip: x.ip, alias: x.alias || null, port: x.port }));
}

// --- Nests / eggs -----------------------------------------------------------

export interface EggOption {
    id: number;
    nestId: number;
    name: string;
    startup: string;
    /** Label → image, in the egg's order. */
    dockerImages: Record<string, string>;
    variables: { name: string; description: string; envVariable: string; defaultValue: string; rules: string }[];
}

const toEgg = ({ attributes: a }: FractalResponseData): EggOption => ({
    id: a.id,
    nestId: a.nest_id,
    name: a.name,
    startup: a.startup ?? '',
    dockerImages: a.docker_images ?? {},
    variables: list(rel(a, 'variables')).map(v => ({
        name: v.name,
        description: v.description ?? '',
        envVariable: v.env_variable,
        defaultValue: v.default_value ?? '',
        rules: v.rules ?? '',
    })),
});

export async function getNests(): Promise<{ id: number; name: string }[]> {
    const { data } = await http.get('/api/application/nests', { params: { per_page: 100 } });

    return (data as FractalPaginatedResponse).data.map(({ attributes: a }) => ({ id: a.id, name: a.name }));
}

export async function getEggs(nestId: number): Promise<EggOption[]> {
    const { data } = await http.get(`/api/application/nests/${nestId}/eggs`, { params: { per_page: 100, include: 'variables' } });

    return (data as FractalPaginatedResponse).data.map(toEgg);
}

export async function getEgg(id: number): Promise<EggOption> {
    const { data } = await http.get(`/api/application/eggs/${id}`, { params: { include: 'variables' } });

    return toEgg(data);
}

// --- Presets ----------------------------------------------------------------

export interface ServerPreset {
    id: number;
    name: string;
    description: string | null;
    cpu: number;
    memory: number;
    disk: number;
    nestId: number | null;
    eggId: number | null;
    createdAt: Date;
}

export interface PresetValues {
    name: string;
    description: string | null;
    cpu: number;
    memory: number;
    disk: number;
    nest_id: number | null;
    egg_id: number | null;
}

/** ServerPresetTransformer returns the raw model. */
const toPreset = ({ attributes: a }: FractalResponseData): ServerPreset => ({
    id: a.id,
    name: a.name,
    description: a.description || null,
    cpu: Number(a.cpu),
    memory: Number(a.memory),
    disk: Number(a.disk),
    nestId: a.nest_id ?? null,
    eggId: a.egg_id ?? null,
    createdAt: new Date(a.created_at),
});

export type PresetQuery = QueryBuilderParams<'name', 'id' | 'name' | 'cpu' | 'memory' | 'disk'>;

export async function getPresets(params: PresetQuery = {}, perPage = 20): Promise<PaginatedResult<ServerPreset>> {
    const { data } = await http.get('/api/application/servers/presets', { params: { ...withQueryBuilderParams(params), per_page: perPage } });

    return { items: (data as FractalPaginatedResponse).data.map(toPreset), pagination: getPaginationSet(data.meta.pagination) };
}

export async function getPreset(id: number): Promise<ServerPreset> {
    const { data } = await http.get(`/api/application/servers/presets/${id}`);

    return toPreset(data);
}

export async function createPreset(values: PresetValues): Promise<ServerPreset> {
    const { data } = await http.post('/api/application/servers/presets', values);

    return toPreset(data);
}

export async function updatePreset(id: number, values: PresetValues): Promise<ServerPreset> {
    const { data } = await http.patch(`/api/application/servers/presets/${id}`, values);

    return toPreset(data);
}

export async function deletePreset(id: number): Promise<void> {
    await http.delete(`/api/application/servers/presets/${id}`);
}

/**
 * The server is owned by the signed-in admin, takes the first free allocation on the
 * node and the preset's egg (egg 1 when none), with the egg's default variables.
 */
export async function createServerFromPreset(presetId: number, nodeId: number): Promise<{ id: number }> {
    const { data } = await http.post('/api/application/servers/preset', { preset_id: presetId, node_id: nodeId });

    return { id: data.attributes.id };
}
