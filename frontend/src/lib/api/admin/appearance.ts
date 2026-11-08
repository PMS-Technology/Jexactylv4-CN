import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';
import type { AlertPosition, AlertType } from '$types/bootstrap';

/**
 * Admin "appearance" endpoints, ported from `api/routes/admin/{theme,links,alerts}.ts`.
 */

// --- Theme ------------------------------------------------------------------

export type ThemeColorKey = 'primary' | 'secondary' | 'background' | 'headers' | 'sidebar';

/** Stores `theme::colors:<key>`. The backend checks `settings.update`, not `theme.update`. */
export async function updateThemeColor(key: ThemeColorKey, value: string): Promise<void> {
    await http.put('/api/application/theme/colors', { key, value });
}

/** Deletes every stored theme key, falling back to config/modules/theme.php. */
export async function resetTheme(): Promise<void> {
    await http.post('/api/application/theme/reset');
}

// --- Links ------------------------------------------------------------------

export interface AdminLink {
    id: number;
    name: string;
    url: string;
    visible: boolean;
    createdAt: Date;
}

export interface LinkValues {
    name: string;
    url: string;
    visible: boolean;
}

/** The backend allows sorting by these only; the legacy table also offered `url`, which 400s. */
export type LinkQuery = QueryBuilderParams<'name', 'id' | 'name' | 'visible'>;

const toLink = ({ attributes }: FractalResponseData): AdminLink => ({
    id: attributes.id,
    name: attributes.name,
    url: attributes.url,
    visible: Boolean(attributes.visible),
    createdAt: new Date(attributes.created_at),
});

export async function getAdminLinks(params: LinkQuery = {}): Promise<PaginatedResult<AdminLink>> {
    const { data } = await http.get('/api/application/links', { params: withQueryBuilderParams(params) });

    return {
        items: (data as FractalPaginatedResponse).data.map(toLink),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

export async function createLink(values: LinkValues): Promise<AdminLink> {
    const { data } = await http.post('/api/application/links', values);

    return toLink(data);
}

export async function updateLink(id: number, values: LinkValues): Promise<AdminLink> {
    const { data } = await http.patch(`/api/application/links/${id}`, values);

    return toLink(data);
}

export async function deleteLink(id: number): Promise<void> {
    await http.delete(`/api/application/links/${id}`);
}

// --- Alerts -----------------------------------------------------------------

export interface AlertSettings {
    enabled: boolean;
    type: AlertType;
    position: AlertPosition;
    content: string;
}

/**
 * Saves the given fields and returns the new alert uuid. Every save rotates the uuid,
 * which re-shows a `center` alert to users who had dismissed it.
 */
export async function updateAlert(settings: Partial<AlertSettings>): Promise<string> {
    const { data } = await http.patch('/api/application/alerts', settings);

    return data as string;
}
