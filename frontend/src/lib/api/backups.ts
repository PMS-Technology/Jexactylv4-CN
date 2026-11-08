import http, { getPaginationSet, type PaginatedResult } from '$lib/api/http';
import { toBackup } from '$lib/api/transformers/server';
import type { Backup } from '$lib/api/definitions/server';

/**
 * Backup endpoints under `/api/client/servers/:id/backups`, ported from
 * `api/routes/server/backups.ts` plus the lock toggle that BackupContextMenu called inline.
 */

export type BackupResponse = PaginatedResult<Backup> & { backupCount: number };

export async function getBackups(uuid: string, page = 1): Promise<BackupResponse> {
    const { data } = await http.get(`/api/client/servers/${uuid}/backups`, { params: { page } });

    return {
        items: (data.data ?? []).map(toBackup),
        pagination: getPaginationSet(data.meta.pagination),
        backupCount: data.meta.backup_count,
    };
}

export async function createBackup(
    uuid: string,
    params: { name?: string; ignored?: string; isLocked: boolean },
): Promise<Backup> {
    const { data } = await http.post(`/api/client/servers/${uuid}/backups`, {
        name: params.name,
        ignored: params.ignored,
        is_locked: params.isLocked,
    });

    return toBackup(data);
}

/** Signed, short-lived download URL. */
export async function getBackupUrl(uuid: string, backup: string): Promise<string> {
    const { data } = await http.get(`/api/client/servers/${uuid}/backups/${backup}/download`);

    return data.attributes.url;
}

export async function restoreBackup(uuid: string, backup: string, truncate?: boolean): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/backups/${backup}/restore`, { truncate });
}

export async function toggleBackupLock(uuid: string, backup: string): Promise<Backup> {
    const { data } = await http.post(`/api/client/servers/${uuid}/backups/${backup}/lock`);

    return toBackup(data);
}

export async function deleteBackup(uuid: string, backup: string): Promise<void> {
    await http.delete(`/api/client/servers/${uuid}/backups/${backup}`);
}
