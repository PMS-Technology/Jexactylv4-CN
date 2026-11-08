import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';
import type { ActivityLog } from '$lib/api/definitions/account';
import { toActivityLog } from '$lib/api/transformers/account';

/**
 * Activity log endpoints, ported from `api/routes/server/activity.ts`.
 *
 * The server endpoint only allows a partial `event` filter. The legacy page also sent
 * `filter[ip]`, which Spatie's query builder rejects with a 400, so IP filtering is not
 * offered here.
 */
export type ServerActivityQuery = QueryBuilderParams<'event', 'timestamp'>;

export async function getServerActivity(
    uuid: string,
    params: ServerActivityQuery = {},
): Promise<PaginatedResult<ActivityLog>> {
    const { data } = await http.get(`/api/client/servers/${uuid}/activity`, {
        params: { ...withQueryBuilderParams(params), include: 'actor' },
    });

    return {
        items: (data as FractalPaginatedResponse).data.map(toActivityLog),
        pagination: getPaginationSet(data.meta.pagination),
    };
}
