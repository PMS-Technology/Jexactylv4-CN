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

/**
 * Admin user and role endpoints, ported from `api/routes/admin/{users,roles}.ts` and the
 * user activity hook in `api/routes/admin/activity.ts`.
 */

export const adminUserKeys = {
    users: ['admin', 'users'] as const,
    user: (id: number) => ['admin', 'users', id] as const,
    roles: ['admin', 'roles'] as const,
    role: (id: number) => ['admin', 'roles', id] as const,
    permissions: ['admin', 'roles', 'permissions'] as const,
};

const toPage = <T>(data: FractalPaginatedResponse, map: (d: FractalResponseData) => T): PaginatedResult<T> => ({
    items: data.data.map(map),
    pagination: getPaginationSet(data.meta.pagination),
});

// --- Users ------------------------------------------------------------------

export interface AdminUser {
    id: number;
    uuid: string;
    externalId: string | null;
    username: string;
    email: string;
    rootAdmin: boolean;
    twoFactor: boolean;
    avatarUrl: string | null;
    roleId: number | null;
    roleName: string | null;
    state: 'active' | 'suspended';
    createdAt: Date;
}

const toUser = ({ attributes: a }: FractalResponseData): AdminUser => ({
    id: a.id,
    uuid: a.uuid,
    externalId: a.external_id ?? null,
    username: a.username,
    email: a.email,
    rootAdmin: Boolean(a.root_admin),
    twoFactor: Boolean(a['2fa']),
    avatarUrl: a.avatar_url ?? null,
    roleId: a.admin_role_id ?? null,
    roleName: a.role_name ?? null,
    state: a.state === 'suspended' ? 'suspended' : 'active',
    createdAt: new Date(a.created_at),
});

/**
 * StoreUserRequest only keeps these keys; `state` is not among them, so the legacy form
 * sent it to no effect. Suspension goes through `suspendUser`.
 */
export interface UserValues {
    external_id: string | null;
    username: string;
    email: string;
    password?: string;
    root_admin: boolean;
    admin_role_id: number | null;
}

export type UserQuery = QueryBuilderParams<'*' | 'username' | 'email', 'id' | 'username' | 'email' | 'use_totp' | 'state' | 'root_admin'>;

export async function getUsers(params: UserQuery = {}): Promise<PaginatedResult<AdminUser>> {
    const { data } = await http.get('/api/application/users', { params: withQueryBuilderParams(params) });

    return toPage(data, toUser);
}

export async function getUser(id: number): Promise<AdminUser> {
    const { data } = await http.get(`/api/application/users/${id}`);

    return toUser(data);
}

export async function createUser(values: UserValues): Promise<AdminUser> {
    const { data } = await http.post('/api/application/users', values);

    return toUser(data);
}

/**
 * UserController::update rejects a non-root admin whose request changes `admin_role_id`
 * (compared strictly with the stored value) or sets `root_admin`, so both are always sent.
 */
export async function updateUser(id: number, values: UserValues): Promise<AdminUser> {
    const { data } = await http.patch(`/api/application/users/${id}`, values);

    return toUser(data);
}

/** Toggles between active and suspended. Root admins cannot be suspended. */
export async function toggleUserSuspension(id: number): Promise<void> {
    await http.post(`/api/application/users/${id}/suspend`);
}

/** Fails with a message while the user still owns servers. */
export async function deleteUser(id: number): Promise<void> {
    await http.delete(`/api/application/users/${id}`);
}

export type UserActivityQuery = QueryBuilderParams<'event' | 'ip', 'timestamp' | 'event'>;

/** Requires `activity.read`, not `users.read`. */
export async function getUserActivity(id: number, params: UserActivityQuery = {}): Promise<PaginatedResult<ActivityLog>> {
    const { data } = await http.get(`/api/application/users/${id}/activity`, {
        params: { ...withQueryBuilderParams(params), include: 'actor' },
    });

    return toPage(data, toActivityLog);
}

// --- Roles ------------------------------------------------------------------

export interface AdminRole {
    id: number;
    name: string;
    description: string | null;
    color: string | null;
    permissions: string[];
}

export interface RoleValues {
    name: string;
    description: string | null;
    color: string | null;
}

/** Groups of `prefix.key` permissions, from `AdminRole::$permissions`. */
export type RolePermissionGroups = Record<string, { description: string; keys: Record<string, string> }>;

const toRole = ({ attributes: a }: FractalResponseData): AdminRole => ({
    id: a.id,
    name: a.name,
    description: a.description || null,
    color: a.color || null,
    permissions: Array.isArray(a.permissions) ? a.permissions : [],
});

export type RoleQuery = QueryBuilderParams<'name', 'id' | 'name'>;

export async function getRoles(params: RoleQuery = {}): Promise<PaginatedResult<AdminRole>> {
    const { data } = await http.get('/api/application/users/roles', { params: withQueryBuilderParams(params) });

    return toPage(data, toRole);
}

/** Roles are few; one page of 100 fills the role picker. */
export async function getAllRoles(): Promise<AdminRole[]> {
    const { data } = await http.get('/api/application/users/roles', { params: { per_page: 100, sort: 'name' } });

    return (data as FractalPaginatedResponse).data.map(toRole);
}

export async function getRole(id: number): Promise<AdminRole> {
    const { data } = await http.get(`/api/application/users/roles/${id}`);

    return toRole(data);
}

export async function getRolePermissionGroups(): Promise<RolePermissionGroups> {
    const { data } = await http.get('/api/application/users/roles/permissions');

    return data.attributes.permissions;
}

export async function createRole(values: RoleValues): Promise<AdminRole> {
    const { data } = await http.post('/api/application/users/roles', values);

    return toRole(data);
}

/** Name, description and colour only. */
export async function updateRole(id: number, values: RoleValues): Promise<AdminRole> {
    const { data } = await http.patch(`/api/application/users/roles/${id}`, values);

    return toRole(data);
}

/**
 * The dedicated endpoint drops any key that is not a known permission. The legacy table
 * sent permissions through the general update route instead, which stores the array as is.
 * It validates with UpdateRoleRequest, which requires `name`, so the current name goes up
 * too (the controller only reads `permissions`).
 */
export async function updateRolePermissions(role: Pick<AdminRole, 'id' | 'name'>, permissions: string[]): Promise<AdminRole> {
    const { data } = await http.patch(`/api/application/users/roles/${role.id}/permissions`, { name: role.name, permissions });

    return toRole(data);
}

/** Users holding the role lose it and their root flag, so they keep no admin access. */
export async function deleteRole(id: number): Promise<void> {
    await http.delete(`/api/application/users/roles/${id}`);
}
