import http from '$lib/api/http';
import { toDatabase } from '$lib/api/transformers/server';
import type { Database } from '$lib/api/definitions/server';

/** Database endpoints under `/api/client/servers/:id/databases`, ported from `api/routes/server/databases.ts`. */

export async function getDatabases(uuid: string, includePassword = true): Promise<Database[]> {
    const { data } = await http.get(`/api/client/servers/${uuid}/databases`, {
        params: includePassword ? { include: 'password' } : undefined,
    });

    return (data.data ?? []).map(toDatabase);
}

export async function createDatabase(
    uuid: string,
    values: { connectionsFrom: string; databaseName: string },
): Promise<Database> {
    const { data } = await http.post(
        `/api/client/servers/${uuid}/databases`,
        { database: values.databaseName, remote: values.connectionsFrom },
        { params: { include: 'password' } },
    );

    return toDatabase(data);
}

export async function rotateDatabasePassword(uuid: string, database: string): Promise<Database> {
    const { data } = await http.post(`/api/client/servers/${uuid}/databases/${database}/rotate-password`);

    return toDatabase(data);
}

export async function deleteDatabase(uuid: string, database: string): Promise<void> {
    await http.delete(`/api/client/servers/${uuid}/databases/${database}`);
}
