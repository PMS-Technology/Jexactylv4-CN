import http, { getPaginationSet, type PaginatedResult } from '$lib/api/http';
import { toServer } from '$lib/api/transformers/server';
import type { Server } from '$lib/api/definitions/server';

export interface ServerQueryParams {
    query?: string;
    page?: number;
    type?: string;
    per_page?: number;
}

/**
 * Lists the servers the authenticated user can see.
 *
 * `type=admin` / `type=admin-all` are backend-supported values that widen the listing
 * for administrators; the dashboard passes them through unchanged.
 */
export async function getServers({ query, ...params }: ServerQueryParams = {}): Promise<PaginatedResult<Server>> {
    const { data } = await http.get('/api/client', {
        params: {
            'filter[*]': query,
            ...params,
        },
    });

    return {
        items: (data.data ?? []).map(toServer),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

/**
 * Fetches a single server plus the caller's permissions on it.
 *
 * The permission list arrives in `meta.is_server_owner` / `meta.user_permissions`; the
 * owner gets `*`, which `hasServerPermission` treats as full access.
 */
export async function getServer(uuid: string): Promise<[Server, string[]]> {
    const { data } = await http.get(`/api/client/servers/${uuid}`);

    return [toServer(data), data.meta?.user_permissions ?? []];
}

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

/** Sends a power signal. Wings applies it asynchronously; status arrives over the socket. */
export async function sendPowerAction(uuid: string, signal: PowerAction): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/power`, { signal });
}

/** Issues a one-off console command. Requires the `control.command` permission. */
export async function sendCommand(uuid: string, command: string): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/command`, { command });
}

/**
 * Requests a short-lived websocket credential for a server.
 *
 * The token expires after roughly 15 minutes; Wings warns over the socket before it
 * lapses and the socket layer calls this again to refresh.
 */
export async function getWebsocketCredentials(uuid: string): Promise<{ token: string; socket: string }> {
    const { data } = await http.get(`/api/client/servers/${uuid}/websocket`);

    return { token: data.data.token, socket: data.data.socket };
}

/** Current resource usage, used as the initial value before the socket pushes updates. */
export async function getServerResourceUsage(uuid: string) {
    const { data } = await http.get(`/api/client/servers/${uuid}/resources`);

    return {
        status: data.attributes.current_state,
        isSuspended: data.attributes.is_suspended,
        memoryUsageInBytes: data.attributes.resources.memory_bytes,
        cpuUsagePercent: data.attributes.resources.cpu_absolute,
        diskUsageInBytes: data.attributes.resources.disk_bytes,
        networkRxInBytes: data.attributes.resources.network_rx_bytes,
        networkTxInBytes: data.attributes.resources.network_tx_bytes,
        uptime: data.attributes.resources.uptime,
    };
}

/** Renames a server or updates its description. */
export async function renameServer(uuid: string, name: string, description?: string): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/settings/rename`, { name, description });
}

/** Triggers a reinstall. Destructive: Wings wipes and re-runs the egg install script. */
export async function reinstallServer(uuid: string): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/settings/reinstall`);
}
