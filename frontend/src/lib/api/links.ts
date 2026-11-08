import http, { type FractalResponseData } from '$lib/api/http';

/** Admin-configured navigation links, shown at the bottom of the sidebar. */
export interface CustomLink {
    id: number;
    name: string;
    url: string;
    visible: boolean;
    createdAt: Date;
    updatedAt?: Date | null;
}

function toCustomLink({ attributes: data }: FractalResponseData): CustomLink {
    return {
        id: data.id,
        name: data.name,
        url: data.url,
        visible: data.visible,
        createdAt: new Date(data.created_at),
        updatedAt: data.updated_at ? new Date(data.updated_at) : null,
    };
}

export async function getLinks(): Promise<CustomLink[]> {
    const { data } = await http.get('/api/client/links');

    return (data.data ?? []).map(toCustomLink);
}
