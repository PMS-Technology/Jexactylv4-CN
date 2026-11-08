/** Formatting helpers, ported from `lib/formatters.ts` so displayed values stay consistent. */

/**
 * Formats a byte count for display. The panel reports limits in MiB and usage in bytes,
 * so both paths go through binary units rather than decimal.
 */
export function bytesToString(bytes: number, decimals = 2): string {
    if (bytes < 1) return '0 Bytes';

    const units = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, i);

    // Whole byte counts read better without decimals.
    const places = i === 0 ? 0 : decimals;

    return `${Number(value.toFixed(places))} ${units[i]}`;
}

/** Converts a MiB figure (how the panel stores limits) into bytes. */
export function mbToBytes(megabytes: number): number {
    return Math.floor(megabytes * 1024 * 1024);
}

/**
 * Formats an IPv4 or IPv6 address, bracketing IPv6 so it reads unambiguously next to a
 * port. Ported from the legacy `lib/formatters.ts`.
 */
export function formatIp(value: string): string {
    // Check if the value is already formatted.
    if (value.length > 0 && value[0] === '[') {
        return value;
    }

    return /([a-f0-9:]+:+)+[a-f0-9]+/.test(value) ? `[${value}]` : value;
}

/** Renders an uptime in milliseconds as `1d 03h 04m 05s`, dropping empty leading units. */
export function formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
    if (hours > 0) return `${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
    if (minutes > 0) return `${pad(minutes)}m ${pad(secs)}s`;

    return `${secs}s`;
}

/** Caps a CPU percentage for display; Wings can briefly report above a server's limit. */
export function formatCpu(percent: number, decimals = 2): string {
    return `${percent.toFixed(decimals)}%`;
}

/**
 * Builds a human string for a limit, where 0 means unlimited in this panel's data model.
 */
export function formatLimit(value: number, unit: string): string {
    return value === 0 ? 'Unlimited' : `${value} ${unit}`;
}

export function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Date and time in the panel's display format, e.g. `2026-11-05 14:03`. */
export function formatDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
