import type { FractalResponseData, FractalResponseList } from '$lib/api/http';
import type {
    Allocation,
    Backup,
    Database,
    EggVariable,
    FileObject,
    Schedule,
    Server,
    Subuser,
    Task,
} from '$lib/api/definitions/server';

/**
 * Fractal → model transformers, ported from `api/definitions/server/transformers.ts`.
 *
 * The snake_case keys here are the backend's response contract. Changing them silently
 * breaks pages, so they are kept character-for-character identical to the legacy file.
 */

export function toEggVariable({ attributes }: FractalResponseData): EggVariable {
    return {
        name: attributes.name,
        description: attributes.description,
        envVariable: attributes.env_variable,
        defaultValue: attributes.default_value,
        serverValue: attributes.server_value,
        isEditable: attributes.is_editable,
        rules: String(attributes.rules ?? '').split('|'),
    };
}

export function toAllocation({ attributes }: FractalResponseData): Allocation {
    return {
        id: attributes.id,
        ip: attributes.ip,
        alias: attributes.ip_alias,
        port: attributes.port,
        notes: attributes.notes,
        isDefault: attributes.is_default,
    };
}

export function toServer({ attributes: data }: FractalResponseData): Server {
    const variables = (data.relationships?.variables as FractalResponseList | undefined)?.data ?? [];
    const allocations = (data.relationships?.allocations as FractalResponseList | undefined)?.data ?? [];

    return {
        id: data.identifier,
        internalId: data.internal_id,
        groupId: data.group_id,
        uuid: data.uuid,
        name: data.name,
        node: data.node,
        isNodeUnderMaintenance: data.is_node_under_maintenance,
        status: data.status,
        invocation: data.invocation,
        dockerImage: data.docker_image,
        sftpDetails: {
            ip: data.sftp_details?.ip,
            port: data.sftp_details?.port,
        },
        description: data.description ? (data.description.length > 0 ? data.description : null) : null,
        limits: { ...data.limits },
        eggFeatures: data.egg_features || [],
        billingProductId: data.billing_product_id,
        renewalDate: data.renewal_date ? new Date(data.renewal_date) : undefined,
        featureLimits: { ...data.feature_limits },
        isTransferring: data.is_transferring,
        variables: variables.map(toEggVariable),
        allocations: allocations.map(toAllocation),
    };
}

export function toBackup({ attributes }: FractalResponseData): Backup {
    return {
        uuid: attributes.uuid,
        isSuccessful: attributes.is_successful,
        isLocked: attributes.is_locked,
        name: attributes.name,
        ignoredFiles: attributes.ignored_files,
        checksum: attributes.checksum,
        bytes: attributes.bytes,
        createdAt: new Date(attributes.created_at),
        completedAt: attributes.completed_at ? new Date(attributes.completed_at) : null,
    };
}

export function toDatabase({ attributes }: FractalResponseData): Database {
    return {
        id: attributes.id,
        name: attributes.name,
        username: attributes.username,
        databaseHostId: attributes.database_host_id,
        connectionString: `${attributes.host.address}:${attributes.host.port}`,
        allowConnectionsFrom: attributes.connections_from,
        // The password include arrives as `{ object: null, attributes: { password } }`. The legacy
        // transformer read `.object` and so never showed it; this reads the actual value, as
        // upstream Pterodactyl does.
        password: (attributes.relationships?.password as FractalResponseData | null | undefined)?.attributes?.password,
    };
}

export function toSubuser(data: FractalResponseData): Subuser {
    const permissions: string[] = data.attributes.permissions || [];

    return {
        uuid: data.attributes.uuid,
        username: data.attributes.username,
        email: data.attributes.email,
        image: data.attributes.image,
        twoFactorEnabled: data.attributes['2fa_enabled'],
        createdAt: new Date(data.attributes.created_at),
        permissions,
        can: permission => permissions.includes(permission),
    };
}

const ARCHIVE_MIMETYPES = [
    'application/vnd.rar', // .rar
    'application/x-rar-compressed', // .rar (2)
    'application/x-tar', // .tar
    'application/x-br', // .tar.br
    'application/x-bzip2', // .tar.bz2, .bz2
    'application/gzip', // .tar.gz, .gz
    'application/x-gzip',
    'application/x-lzip', // .tar.lz4, .lz4
    'application/x-sz', // .tar.sz, .sz
    'application/x-xz', // .tar.xz, .xz
    'application/zstd', // .tar.zst, .zst
    'application/zip', // .zip
];

const NON_EDITABLE_MATCHES = [
    'application/jar',
    'application/octet-stream',
    'inode/directory',
    /^image\/(?!svg\+xml)/,
];

export function toFileObject(data: FractalResponseData): FileObject {
    return {
        key: `${data.attributes.is_file ? 'file' : 'dir'}_${data.attributes.name}`,
        name: data.attributes.name,
        mode: data.attributes.mode,
        modeBits: data.attributes.mode_bits,
        size: Number(data.attributes.size),
        isFile: data.attributes.is_file,
        isSymlink: data.attributes.is_symlink,
        mimetype: data.attributes.mimetype,
        createdAt: new Date(data.attributes.created_at),
        modifiedAt: new Date(data.attributes.modified_at),

        isArchiveType() {
            return this.isFile && ARCHIVE_MIMETYPES.includes(this.mimetype);
        },

        isEditable() {
            if (this.isArchiveType() || !this.isFile) return false;

            return NON_EDITABLE_MATCHES.every(m => !this.mimetype.match(m));
        },
    };
}

export function toTask(data: Record<string, any>): Task {
    return {
        id: data.id,
        sequenceId: data.sequence_id,
        action: data.action,
        payload: data.payload,
        timeOffset: data.time_offset,
        isQueued: data.is_queued,
        continueOnFailure: data.continue_on_failure,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
    };
}

export function toSchedule({ attributes }: FractalResponseData): Schedule {
    const tasks = (attributes.relationships?.tasks as FractalResponseList | undefined)?.data ?? [];

    return {
        id: attributes.id,
        name: attributes.name,
        cron: {
            dayOfWeek: attributes.cron.day_of_week,
            month: attributes.cron.month,
            dayOfMonth: attributes.cron.day_of_month,
            hour: attributes.cron.hour,
            minute: attributes.cron.minute,
        },
        isActive: attributes.is_active,
        isProcessing: attributes.is_processing,
        onlyWhenOnline: attributes.only_when_online,
        lastRunAt: attributes.last_run_at ? new Date(attributes.last_run_at) : null,
        nextRunAt: attributes.next_run_at ? new Date(attributes.next_run_at) : null,
        createdAt: new Date(attributes.created_at),
        updatedAt: new Date(attributes.updated_at),
        tasks: tasks.map(row => toTask(row.attributes)),
    };
}
