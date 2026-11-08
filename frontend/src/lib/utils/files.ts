/**
 * File path helpers, ported from the legacy `lib/helpers.ts` so URL and directory
 * handling stays byte-for-byte compatible with the old frontend.
 */

/** Collapses duplicate slashes and normalises an empty path to `/`. */
export function cleanDirectoryPath(path: string): string {
    return path.replace(/(\/(\/*))|(^$)/g, '/');
}

/**
 * Joins path segments with `/`, replacing the legacy `pathe` dependency. The panel
 * paths are always POSIX, so a small local implementation is enough.
 */
export function pathJoin(...parts: string[]): string {
    const joined = parts
        .filter(part => part !== '')
        .join('/')
        .replace(/\/+/g, '/');

    return joined.startsWith('/') ? joined : `/${joined}`;
}

/** URL-encodes each segment of a path while preserving the slashes. */
export function encodePathSegments(path: string): string {
    return path
        .split('/')
        .map(s => encodeURIComponent(s))
        .join('/');
}

/** Reads the directory path out of the location hash (`#foo/bar` → `foo/bar`). */
export function hashToPath(hash: string): string {
    return hash.length > 0 ? decodeURIComponent(hash.substring(1)) : '/';
}

/**
 * Renders an octal mode string (`0644`) as the familiar `rw-r--r--` notation, ported
 * from the legacy `lib/strings.ts`.
 */
export function fileBitsToString(mode: string, directory: boolean): string {
    const m = parseInt(mode, 8);

    let buf = '';
    'dalTLDpSugct?'.split('').forEach((c, i) => {
        if ((m & (1 << (32 - 1 - i))) !== 0) {
            buf = buf + c;
        }
    });

    if (buf.length === 0) {
        // If the file is directory, make sure it has the directory flag.
        buf = directory ? 'd' : '-';
    }

    'rwxrwxrwx'.split('').forEach((c, i) => {
        if ((m & (1 << (9 - 1 - i))) !== 0) {
            buf = buf + c;
        } else {
            buf = buf + '-';
        }
    });

    return buf;
}
