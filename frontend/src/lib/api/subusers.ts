import http from '$lib/api/http';
import { toSubuser } from '$lib/api/transformers/server';
import type { Subuser } from '$lib/api/definitions/server';

/**
 * Subuser endpoints under `/api/client/servers/:id/users`, ported from
 * `api/routes/server/subusers.ts` and `permissions.ts`.
 */

/** Permission catalogue from GET /api/client/permissions, grouped by prefix (e.g. `control`). */
export type PanelPermissions = Record<string, { description: string; keys: Record<string, string> }>;

export async function getSubuserPermissions(): Promise<PanelPermissions> {
    const { data } = await http.get('/api/client/permissions');

    return data.attributes.permissions;
}

export async function getSubusers(uuid: string): Promise<Subuser[]> {
    const { data } = await http.get(`/api/client/servers/${uuid}/users`);

    return (data.data ?? []).map(toSubuser);
}

/** Invites a subuser by email, or updates the permissions of `subuser` when given. */
export async function modifySubuser(
    uuid: string,
    params: { email: string; permissions: string[] },
    subuser?: Subuser,
): Promise<Subuser> {
    const { data } = await http.post(`/api/client/servers/${uuid}/users${subuser ? `/${subuser.uuid}` : ''}`, params);

    return toSubuser(data);
}

export async function deleteSubuser(uuid: string, user: string): Promise<void> {
    await http.delete(`/api/client/servers/${uuid}/users/${user}`);
}
