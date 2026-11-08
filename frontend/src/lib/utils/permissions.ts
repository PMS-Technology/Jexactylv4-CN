/**
 * Admin permission matching, ported from `plugins/adminPermissions.ts` so the rules
 * stay identical to the ones the backend's role system was built against.
 *
 * A `*` in the first slot is a wildcard for everything. A required key ending in
 * `.*` matches when the user holds any permission in that namespace.
 */
export function hasAdminPermission(userPermissions: string[], required?: string | string[]): boolean {
    if (!required) return true;
    if (userPermissions[0] === '*') return true;

    const keys = Array.isArray(required) ? required : [required];

    return keys.some(
        permission =>
            (permission.endsWith('.*') &&
                userPermissions.some(p => p.startsWith(permission.split('.')[0] ?? ''))) ||
            userPermissions.includes(permission),
    );
}

/**
 * Subuser permission matching for server routes.
 *
 * Server permissions come from `GET /api/client/servers/{id}` alongside the server
 * itself. The owner receives `*`, which grants everything.
 */
export function hasServerPermission(serverPermissions: string[], required?: string | string[]): boolean {
    if (!required) return true;
    if (serverPermissions.includes('*')) return true;

    const keys = Array.isArray(required) ? required : [required];

    return keys.some(permission => {
        if (permission.endsWith('.*')) {
            const namespace = permission.slice(0, -2);

            return serverPermissions.some(p => p === namespace || p.startsWith(`${namespace}.`));
        }

        return serverPermissions.includes(permission);
    });
}
