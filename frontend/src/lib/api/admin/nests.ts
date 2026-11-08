import http, {
    getPaginationSet,
    withQueryBuilderParams,
    type FractalPaginatedResponse,
    type FractalResponseData,
    type PaginatedResult,
    type QueryBuilderParams,
} from '$lib/api/http';

/**
 * Nest, egg and egg variable endpoints, ported from `api/routes/admin/nests.ts` and
 * `api/routes/admin/eggs.ts`. The server forms keep their own lighter egg lookups in
 * `servers.ts`.
 */

export const adminNestKeys = {
    all: ['admin', 'nests'] as const,
    nest: (id: number) => ['admin', 'nests', id] as const,
    eggs: (nestId: number) => ['admin', 'nests', nestId, 'eggs'] as const,
    egg: (id: number) => ['admin', 'eggs', id] as const,
};

// --- Nests ------------------------------------------------------------------

export interface Nest {
    id: number;
    uuid: string;
    author: string;
    name: string;
    description: string | null;
    createdAt: Date;
}

const toNest = ({ attributes: a }: FractalResponseData): Nest => ({
    id: a.id,
    uuid: a.uuid,
    author: a.author,
    name: a.name,
    description: a.description || null,
    createdAt: new Date(a.created_at),
});

export type NestQuery = QueryBuilderParams<'name', 'id' | 'name'>;

export async function getNestList(params: NestQuery = {}): Promise<PaginatedResult<Nest>> {
    const { data } = await http.get('/api/application/nests', { params: withQueryBuilderParams(params) });

    return { items: (data as FractalPaginatedResponse).data.map(toNest), pagination: getPaginationSet(data.meta.pagination) };
}

export async function getNest(id: number): Promise<Nest> {
    const { data } = await http.get(`/api/application/nests/${id}`);

    return toNest(data);
}

export interface NestValues {
    name: string;
    description: string | null;
    /** Validated as an email on create and update; the backend keeps the stored author on update. */
    author: string;
}

export async function createNest(values: NestValues): Promise<Nest> {
    const { data } = await http.post('/api/application/nests', values);

    return toNest(data);
}

export async function updateNest(id: number, values: NestValues): Promise<Nest> {
    const { data } = await http.patch(`/api/application/nests/${id}`, values);

    return toNest(data);
}

/** Refused while any server uses the nest; its eggs are deleted with it. */
export async function deleteNest(id: number): Promise<void> {
    await http.delete(`/api/application/nests/${id}`);
}

// --- Eggs -------------------------------------------------------------------

export interface EggSummary {
    id: number;
    name: string;
    description: string | null;
    author: string;
}

export type EggQuery = QueryBuilderParams<'name', 'id' | 'name'>;

export async function getNestEggs(nestId: number, params: EggQuery = {}): Promise<PaginatedResult<EggSummary>> {
    const { data } = await http.get(`/api/application/nests/${nestId}/eggs`, { params: withQueryBuilderParams(params) });

    return {
        items: (data as FractalPaginatedResponse).data.map(({ attributes: a }) => ({ id: a.id, name: a.name, description: a.description || null, author: a.author })),
        pagination: getPaginationSet(data.meta.pagination),
    };
}

export interface EggVariable {
    id: number;
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    userViewable: boolean;
    userEditable: boolean;
    rules: string;
}

export interface Egg {
    id: number;
    uuid: string;
    nestId: number;
    nest: { id: number; name: string } | null;
    author: string;
    name: string;
    description: string;
    /** Label → image, in the egg's order. */
    dockerImages: Record<string, string>;
    startup: string;
    config: {
        /** Pretty-printed JSON, as edited. */
        files: string;
        startup: string;
        stop: string;
        /** The egg this one inherits its configuration from. */
        extends: number | null;
    };
    script: { install: string; entry: string; container: string; privileged: boolean; extends: number | null };
    variables: EggVariable[];
}

const toVariable = (v: Record<string, any>): EggVariable => ({
    id: v.id,
    name: v.name,
    description: v.description ?? '',
    envVariable: v.env_variable,
    defaultValue: v.default_value ?? '',
    userViewable: Boolean(v.user_viewable),
    userEditable: Boolean(v.user_editable),
    rules: v.rules ?? '',
});

const pretty = (value: unknown) => (value === null || value === undefined ? '{}' : JSON.stringify(value, null, '\t'));

const toEgg = ({ attributes: a }: FractalResponseData): Egg => {
    const nest = a.relationships?.nest as FractalResponseData | undefined;
    const variables = a.relationships?.variables as { data?: FractalResponseData[] } | undefined;

    return {
        id: a.id,
        uuid: a.uuid,
        nestId: a.nest_id,
        nest: nest && nest.object !== 'null_resource' ? { id: nest.attributes.id, name: nest.attributes.name } : null,
        author: a.author,
        name: a.name,
        description: a.description ?? '',
        dockerImages: a.docker_images ?? {},
        startup: a.startup ?? '',
        config: {
            files: pretty(a.config.files),
            startup: pretty(a.config.startup),
            stop: a.config.stop ?? '',
            extends: a.config.extends ?? null,
        },
        script: {
            install: a.script.install ?? '',
            entry: a.script.entry ?? '',
            container: a.script.container ?? '',
            privileged: Boolean(a.script.privileged),
            extends: a.script.extends ?? null,
        },
        variables: (variables?.data ?? []).map(d => toVariable(d.attributes)),
    };
};

export async function getEgg(id: number): Promise<Egg> {
    const { data } = await http.get(`/api/application/eggs/${id}`, { params: { include: 'nest,variables' } });

    return toEgg(data);
}

/**
 * `features` and `file_denylist` are left out: EggTransformer does not return them, so
 * the form could only overwrite them blindly. Imports still set them.
 */
export interface EggValues {
    name: string;
    description: string | null;
    docker_images: Record<string, string>;
    startup: string;
    /** JSON text; the backend checks it parses. */
    config_files: string;
    config_startup: string;
    config_stop: string | null;
}

export async function createEgg(nestId: number, values: EggValues): Promise<{ id: number }> {
    const { data } = await http.post('/api/application/eggs', { nest_id: nestId, ...values });

    return { id: data.attributes.id };
}

export async function updateEgg(id: number, values: Partial<EggValues> & { script_container?: string; script_entry?: string; script_install?: string }): Promise<void> {
    await http.patch(`/api/application/eggs/${id}`, values);
}

/** Refused while any server uses the egg. */
export async function deleteEgg(id: number): Promise<void> {
    await http.delete(`/api/application/eggs/${id}`);
}

/** The egg as the pretty-printed JSON document the panel exports. */
export async function exportEgg(id: number): Promise<string> {
    // The exporter returns a JSON string, which the controller encodes once more.
    const { data } = await http.get(`/api/application/eggs/${id}/export`, { transformResponse: r => r });
    const decoded = JSON.parse(data);

    return typeof decoded === 'string' ? decoded : JSON.stringify(decoded, null, 4);
}

/** `content` is sent as is; YAML exports are accepted as well as JSON. */
export async function importEgg(nestId: number, content: string, type: 'application/json' | 'application/yaml'): Promise<{ id: number }> {
    // Without the identity transform axios JSON-encodes the string, so the backend saw a
    // quoted string instead of the document.
    const { data } = await http.post(`/api/application/nests/${nestId}/import`, content, {
        headers: { 'Content-Type': type },
        transformRequest: [body => body],
    });

    return { id: data.attributes.id };
}

// --- Egg variables ----------------------------------------------------------

export interface EggVariableValues {
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: boolean;
    user_editable: boolean;
    rules: string;
}

/** Names the backend refuses (`EggVariable::RESERVED_ENV_NAMES`). */
export const reservedEnvNames = ['SERVER_MEMORY', 'SERVER_IP', 'SERVER_PORT', 'ENV', 'HOME', 'USER', 'STARTUP', 'SERVER_UUID', 'UUID'];

export const variableValues = (v: EggVariable): EggVariableValues => ({
    name: v.name,
    description: v.description,
    env_variable: v.envVariable,
    default_value: v.defaultValue,
    user_viewable: v.userViewable,
    user_editable: v.userEditable,
    rules: v.rules,
});

export async function createEggVariable(eggId: number, values: EggVariableValues): Promise<EggVariable> {
    const { data } = await http.post(`/api/application/eggs/${eggId}/variables`, values);

    return toVariable(data.attributes);
}

/** Saves every listed variable in one transaction. */
export async function updateEggVariables(eggId: number, variables: (EggVariableValues & { id: number })[]): Promise<EggVariable[]> {
    const { data } = await http.patch(`/api/application/eggs/${eggId}/variables`, variables);

    return (data.data as FractalResponseData[]).map(d => toVariable(d.attributes));
}

/** Removes the variable from every server using the egg. */
export async function deleteEggVariable(eggId: number, variableId: number): Promise<void> {
    await http.delete(`/api/application/eggs/${eggId}/variables/${variableId}`);
}
