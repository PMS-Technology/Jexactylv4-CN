import axios, { type AxiosInstance } from 'axios';

/**
 * Shared axios instance.
 *
 * Authentication is Laravel session + cookie, exactly as the legacy client does it:
 * `withCredentials` sends the session cookie, and the CSRF token comes from the
 * `<meta name="csrf-token">` tag that the Blade wrapper renders. No bearer tokens are
 * involved and no credentials are stored client-side.
 */
const http: AxiosInstance = axios.create({
    withCredentials: true,
    timeout: 20000,
    headers: {
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

/** Reads the CSRF token Laravel rendered into the page head. */
export function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

http.interceptors.request.use(config => {
    // Laravel's VerifyCsrfToken middleware only inspects state-changing verbs.
    const method = (config.method ?? 'get').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        config.headers.set('X-CSRF-TOKEN', csrfToken());
    }

    return config;
});

http.interceptors.response.use(
    response => response,
    error => {
        const status = error?.response?.status;

        // A 419 means the session expired while the tab was open. Reloading lets Laravel
        // redirect to the login page and issue a fresh token, which matches what the
        // legacy frontend effectively did by failing and forcing the user to refresh.
        if (status === 419) {
            window.location.reload();
        }

        return Promise.reject(error);
    },
);

export default http;

/**
 * Converts an error into a human readable response, preferring the server's message
 * when one is available. Ported from the legacy client so error copy stays consistent.
 */
export function httpErrorToHuman(error: unknown): string {
    const err = error as {
        message?: string;
        response?: { data?: unknown };
    };

    if (err?.response?.data) {
        let data = err.response.data as Record<string, any>;

        // Some non-JSON requests still return the error as a JSON block; try to parse it.
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch {
                // Not JSON, fall through to the generic message.
            }
        }

        if (data?.errors?.[0]?.detail) {
            return data.errors[0].detail as string;
        }

        // Errors straight from Wings, mostly for file uploads.
        if (typeof data?.error === 'string') {
            return data.error;
        }
    }

    return err?.message ?? 'An unexpected error occurred.';
}

export interface FractalResponseData {
    object: string;
    attributes: {
        [k: string]: any;
        relationships?: Record<string, FractalResponseData | FractalResponseList | null | undefined>;
    };
    meta?: any;
}

export interface FractalResponseList {
    object: 'list';
    data: FractalResponseData[];
}

export interface FractalPaginatedResponse extends FractalResponseList {
    meta: {
        pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
        };
    };
}

export interface PaginationDataSet {
    total: number;
    count: number;
    perPage: number;
    currentPage: number;
    totalPages: number;
}

export interface PaginatedResult<T> {
    items: T[];
    pagination: PaginationDataSet;
}

export function getPaginationSet(data: FractalPaginatedResponse['meta']['pagination']): PaginationDataSet {
    return {
        total: data.total,
        count: data.count,
        perPage: data.per_page,
        currentPage: data.current_page,
        totalPages: data.total_pages,
    };
}

type QueryBuilderFilterValue = string | number | boolean | null;

export interface QueryBuilderParams<FilterKeys extends string = string, SortKeys extends string = string> {
    page?: number;
    filters?: {
        [K in FilterKeys]?: QueryBuilderFilterValue | Readonly<QueryBuilderFilterValue[]>;
    };
    sorts?: {
        [K in SortKeys]?: -1 | 0 | 1 | 'asc' | 'desc' | null;
    };
}

/**
 * Builds query parameters for the Laravel Query Builder package, applying sorts and
 * filters the same way the legacy client did so backend behaviour is unchanged.
 */
export function withQueryBuilderParams(data?: QueryBuilderParams): Record<string, unknown> {
    if (!data) return {};

    const filters = Object.keys(data.filters ?? {}).reduce<Record<string, unknown>>((obj, key) => {
        const value = data.filters?.[key];

        return !value || value === '' ? obj : { ...obj, [`filter[${key}]`]: value };
    }, {});

    const sorts = Object.keys(data.sorts ?? {}).reduce<string[]>((arr, key) => {
        const value = data.sorts?.[key];
        if (!value || !['asc', 'desc', 1, -1].includes(value)) {
            return arr;
        }

        return [...arr, (value === -1 || value === 'desc' ? '-' : '') + key];
    }, []);

    return {
        ...filters,
        sort: sorts.length ? sorts.join(',') : undefined,
        page: data.page,
    };
}
