import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';

/**
 * Database host endpoints, ported from `api/routes/admin/databases.ts`.
 *
 * Creating or updating a host connects to it with the submitted credentials
 * (`SELECT 1`) inside the transaction, so bad credentials come back as an error and
 * nothing is saved.
 */

export const adminDatabaseKeys = {
    all: ['admin', 'database-hosts'] as const,
    host: (id: number) => ['admin', 'database-hosts', id] as const,
};

export interface DatabaseHost {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    /** Only filled when requested with `include=databases`. */
    databaseCount: number | null;
    createdAt: Date;
}

export interface DatabaseHostValues {
    name: string;
    host: string;
    port: number;
    username: string;
    /** Required on create. On update, an empty value keeps the stored password. */
    password?: string;
}

const toHost = ({ attributes: a }: FractalResponseData): DatabaseHost => {
    const databases = a.relationships?.databases;

    return {
        id: a.id,
        name: a.name,
        host: a.host,
        port: Number(a.port),
        username: a.username,
        databaseCount: databases && 'data' in databases ? databases.data.length : null,
        createdAt: new Date(a.created_at),
    };
};

export const hostAddress = (h: Pick<DatabaseHost, 'host' | 'port'>) => `${h.host}:${h.port}`;

export type DatabaseHostQuery = QueryBuilderParams<'name' | 'host', 'id' | 'name' | 'host'>;

export async function getDatabaseHosts(params: DatabaseHostQuery = {}): Promise<PaginatedResult<DatabaseHost>> {
    const { data } = await http.get('/api/application/databases', { params: withQueryBuilderParams(params) });

    return {
        items: (data as FractalPaginatedResponse).data.map(toHost),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

/** The `databases` include is null unless the role also holds the server-databases ACL. */
export async function getDatabaseHost(id: number): Promise<DatabaseHost> {
    const { data } = await http.get(`/api/application/databases/${id}`, { params: { include: 'databases' } });

    return toHost(data);
}

export async function createDatabaseHost(values: DatabaseHostValues): Promise<DatabaseHost> {
    const { data } = await http.post('/api/application/databases', values);

    return toHost(data);
}

export async function updateDatabaseHost(id: number, values: DatabaseHostValues): Promise<DatabaseHost> {
    const { data } = await http.patch(`/api/application/databases/${id}`, values);

    return toHost(data);
}

export async function deleteDatabaseHost(id: number): Promise<void> {
    await http.delete(`/api/application/databases/${id}`);
}
