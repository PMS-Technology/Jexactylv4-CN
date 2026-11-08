import http, { type FractalResponseData } from '$lib/api/http';
import type { ServerGroup } from '$lib/api/definitions/server';

/**
 * Server group routes, ported from `api/routes/server/groups.ts`. Groups are per-user
 * (`user_id` is set on creation) and the backend re-checks ownership on every mutation.
 */

export function rawDataToServerGroup({ attributes: data }: FractalResponseData): ServerGroup {
    return {
        id: data.id,
        name: data.name,
        color: data.color,
    };
}

export async function getServerGroups(): Promise<ServerGroup[]> {
    const { data } = await http.get('/api/client/groups');

    return (data.data ?? []).map(rawDataToServerGroup);
}

export async function createServerGroup(values: { name: string; color?: string }): Promise<ServerGroup> {
    const { data } = await http.post('/api/client/groups', values);

    return rawDataToServerGroup(data);
}

export async function addServerToGroup(id: number, server: string): Promise<void> {
    await http.post(`/api/client/groups/${id}/add`, { server });
}

export async function removeServerFromGroup(id: number, server: string): Promise<void> {
    await http.post(`/api/client/groups/${id}/remove`, { server });
}

export async function updateServerGroup(id: number, values: { name: string; color?: string }): Promise<void> {
    await http.patch(`/api/client/groups/${id}`, values);
}

export async function deleteServerGroup(id: number): Promise<void> {
    await http.delete(`/api/client/groups/${id}`);
}
