/**
 * Formats an uptime in seconds the way the console displays it. Exported so that callers
 * needing the exact rendered string (for measuring or sizing) stay in sync with the view.
 */
export function uptimeToString(uptime: number): string {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((Math.floor(uptime) / 60 / 60) % 24);
    const remainder = Math.floor(uptime - hours * 60 * 60);
    const minutes = Math.floor((remainder / 60) % 60);
    const seconds = remainder % 60;

    return days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m ${seconds}s`;
}

export default ({ uptime }: { uptime: number }) => <>{uptimeToString(uptime)}</>;
