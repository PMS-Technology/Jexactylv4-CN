import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';

/**
 * Node and allocation endpoints, ported from `api/routes/admin/nodes.ts`.
 */

export const adminNodeKeys = {
    all: ['admin', 'nodes'] as const,
    node: (id: number) => ['admin', 'nodes', id] as const,
    allocations: (id: number) => ['admin', 'nodes', id, 'allocations'] as const,
};

export interface AdminNode {
    id: number;
    uuid: string;
    name: string;
    public: boolean;
    databaseHostId: number | null;
    fqdn: string;
    sftpAlias: string | null;
    scheme: 'http' | 'https';
    behindProxy: boolean;
    maintenanceMode: boolean;
    /** MiB */
    memory: number;
    memoryOverallocate: number;
    /** MiB */
    disk: number;
    diskOverallocate: number;
    daemonBase: string;
    listenPortHttp: number;
    publicPortHttp: number;
    listenPortSftp: number;
    publicPortSftp: number;
    deployable: boolean;
    deployableFree: boolean;
    deploymentFee: number;
    /** MiB summed over the node's servers. */
    allocated: { memory: number; disk: number };
    createdAt: Date;
}

/** NodeTransformer returns `Node::toArray()`, so the keys are the raw columns. */
const toNode = ({ attributes: a }: FractalResponseData): AdminNode => ({
    id: a.id,
    uuid: a.uuid,
    name: a.name,
    public: Boolean(a.public),
    databaseHostId: a.database_host_id ?? null,
    fqdn: a.fqdn,
    sftpAlias: a.sftp_alias || null,
    scheme: a.scheme === 'https' ? 'https' : 'http',
    behindProxy: Boolean(a.behind_proxy),
    maintenanceMode: Boolean(a.maintenance_mode),
    memory: Number(a.memory),
    memoryOverallocate: Number(a.memory_overallocate),
    disk: Number(a.disk),
    diskOverallocate: Number(a.disk_overallocate),
    daemonBase: a.daemon_base,
    listenPortHttp: Number(a.listen_port_http),
    publicPortHttp: Number(a.public_port_http),
    listenPortSftp: Number(a.listen_port_sftp),
    publicPortSftp: Number(a.public_port_sftp),
    deployable: Boolean(a.deployable),
    deployableFree: Boolean(a.deployable_free),
    deploymentFee: Number(a.deployment_fee ?? 0),
    allocated: { memory: Number(a.allocated_resources?.memory ?? 0), disk: Number(a.allocated_resources?.disk ?? 0) },
    createdAt: new Date(a.created_at),
});

/** Keys StoreNodeRequest keeps. `daemon_base` is only honoured on create. */
export interface NodeValues {
    name: string;
    database_host_id: number | null;
    fqdn: string;
    sftp_alias: string | null;
    scheme: 'http' | 'https';
    behind_proxy: boolean;
    public: boolean;
    deployable: boolean;
    deployable_free: boolean;
    deployment_fee: number;
    listen_port_http: number;
    public_port_http: number;
    listen_port_sftp: number;
    public_port_sftp: number;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    daemon_base?: string;
}

export type NodeQuery = QueryBuilderParams<'name' | 'fqdn', 'id' | 'name' | 'fqdn' | 'memory' | 'disk'>;

export async function getNodes(params: NodeQuery = {}, perPage = 20): Promise<PaginatedResult<AdminNode>> {
    const { data } = await http.get('/api/application/nodes', { params: { ...withQueryBuilderParams(params), per_page: perPage } });

    return { items: (data as FractalPaginatedResponse).data.map(toNode), pagination: getPaginationSet(data.meta.pagination) };
}

export async function getNode(id: number): Promise<AdminNode> {
    const { data } = await http.get(`/api/application/nodes/${id}`);

    return toNode(data);
}

export async function createNode(values: NodeValues): Promise<AdminNode> {
    const { data } = await http.post('/api/application/nodes', values);

    return toNode(data);
}

/**
 * NodeUpdateService saves first and then pushes the new config to Wings. When Wings is
 * unreachable the save is kept but the request fails with ConfigurationNotPersistedException;
 * the legacy page showed that as a failed save. Here the node is reloaded and the message
 * comes back as a warning.
 */
export async function updateNode(id: number, values: NodeValues): Promise<{ node: AdminNode; warning: string | null }> {
    try {
        const { data } = await http.patch(`/api/application/nodes/${id}`, values);

        return { node: toNode(data), warning: null };
    } catch (error) {
        const detail = (error as { response?: { data?: { errors?: { code?: string; detail?: string }[] } } }).response?.data?.errors?.[0];
        if (detail?.code !== 'ConfigurationNotPersistedException') throw error;

        return { node: await getNode(id), warning: detail.detail ?? null };
    }
}

/** Fails while servers are still on the node. */
export async function deleteNode(id: number): Promise<void> {
    await http.delete(`/api/application/nodes/${id}`);
}

/** The Wings `config.yml` for this node, including its daemon token. */
export async function getNodeConfiguration(id: number): Promise<string> {
    const { data } = await http.get(`/api/application/nodes/${id}/configuration`, { params: { format: 'yaml' }, responseType: 'text' });

    return String(data);
}

export interface NodeInformation {
    version: string | null;
    system: { type: string; arch: string | null; release: string | null; cpus: number | null; supercharged: boolean };
}

/** Asks the daemon itself; fails when the node is unreachable. */
export async function getNodeInformation(id: number): Promise<NodeInformation> {
    const { data } = await http.get(`/api/application/nodes/${id}/information`);

    return data;
}

export interface NodeUtilization {
    cpu: number;
    memory: { total: number; used: number };
    swap: { total: number; used: number };
    disk: { total: number; used: number };
}

/** Only JexpanelSuperDaemon ("supercharged") nodes answer this. Bytes. */
export async function getNodeUtilization(id: number): Promise<NodeUtilization> {
    const { data } = await http.get(`/api/application/nodes/${id}/utilization`);

    return data;
}

// --- Allocations ------------------------------------------------------------

export interface AdminAllocation {
    id: number;
    ip: string;
    alias: string | null;
    port: number;
    serverId: number | null;
    serverName: string | null;
}

export type AllocationQuery = QueryBuilderParams<'search' | 'server_id', 'ip' | 'port' | 'server_id'>;

export async function getAllocations(nodeId: number, params: AllocationQuery = {}, perPage = 20): Promise<PaginatedResult<AdminAllocation>> {
    const { data } = await http.get(`/api/application/nodes/${nodeId}/allocations`, {
        params: { ...withQueryBuilderParams(params), include: 'server', per_page: perPage },
    });

    return {
        items: (data as FractalPaginatedResponse).data.map(({ attributes: a }) => {
            const server = a.relationships?.server as FractalResponseData | null | undefined;

            return {
                id: a.id,
                ip: a.ip,
                alias: a.alias || null,
                port: a.port,
                serverId: a.server_id ?? null,
                serverName: server && server.object === 'server' ? server.attributes.name : null,
            };
        }),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

/** Counts for the usage bar: one request each, reading only the pagination total. */
export async function getAllocationCounts(nodeId: number): Promise<{ total: number; free: number }> {
    const [all, free] = await Promise.all([
        http.get(`/api/application/nodes/${nodeId}/allocations`, { params: { per_page: 1 } }),
        http.get(`/api/application/nodes/${nodeId}/allocations`, { params: { per_page: 1, 'filter[server_id]': '0' } }),
    ]);

    return { total: all.data.meta.pagination.total, free: free.data.meta.pagination.total };
}

/**
 * One IP (or CIDR) per request. AssignmentService rejects ports ≤ 1024, so 1025 is the
 * lowest usable port even though the request rules say 1024.
 */
export async function createAllocations(
    nodeId: number,
    values: { ip: string; start_port: number; end_port: number | null; alias: string | null },
): Promise<void> {
    await http.post(`/api/application/nodes/${nodeId}/allocations`, values);
}

/** Fails while a server uses the allocation. */
export async function deleteAllocation(nodeId: number, allocationId: number): Promise<void> {
    await http.delete(`/api/application/nodes/${nodeId}/allocations/${allocationId}`);
}

export async function deleteUnusedAllocations(nodeId: number): Promise<void> {
    await http.delete(`/api/application/nodes/${nodeId}/allocations`);
}
