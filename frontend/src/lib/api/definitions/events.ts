/**
 * Wings socket event and request names, ported from `@server/events.ts`.
 *
 * These strings are the daemon's wire protocol and must stay character-for-character
 * identical; see the Websocket plugin for how they travel.
 */
export enum SocketEvent {
    DAEMON_MESSAGE = 'daemon message',
    DAEMON_ERROR = 'daemon error',
    INSTALL_OUTPUT = 'install output',
    INSTALL_STARTED = 'install started',
    INSTALL_COMPLETED = 'install completed',
    CONSOLE_OUTPUT = 'console output',
    STATUS = 'status',
    STATS = 'stats',
    TRANSFER_LOGS = 'transfer logs',
    TRANSFER_STATUS = 'transfer status',
    BACKUP_COMPLETED = 'backup completed',
    BACKUP_RESTORE_COMPLETED = 'backup restore completed',
}

export enum SocketRequest {
    SEND_LOGS = 'send logs',
    SEND_STATS = 'send stats',
    SET_STATE = 'set state',
}

/** Payload of the `stats` event; arrives as a JSON string inside `args[0]`. */
export interface SocketStats {
    cpu_absolute: number;
    memory_bytes: number;
    disk_bytes: number;
    network: {
        tx_bytes: number;
        rx_bytes: number;
    };
    /** Milliseconds. */
    uptime: number;
}
