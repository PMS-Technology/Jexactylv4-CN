import { getContext, setContext } from 'svelte';
import type { Server } from '$lib/api/definitions/server';
import type { ServerPowerState } from '$lib/api/definitions/server';
import { getServer, getWebsocketCredentials } from '$lib/api/servers';
import { hasServerPermission } from '$lib/utils/permissions';
import { Websocket } from '$lib/websocket/Websocket';

/**
 * Per-server state, replacing the legacy easy-peasy `ServerContext` store.
 *
 * One instance lives in the Svelte context of each /server/:id mount, so navigating
 * between two servers never bleeds state: the ServerArea component creates a fresh
 * store for the route param and destroys the socket when the param changes or the
 * component unmounts (what `clearServerState` did on the legacy side).
 */

/** JWT failures that are recoverable by fetching a fresh token, not a real auth error. */
const RECONNECT_ERRORS = ['jwt: exp claim is invalid', 'jwt: created too far in past (denylist)'];

/** Connection banner text; the literal 'connecting' renders the spinner variant. */
export type SocketBanner = 'connecting' | string | null;

export class ServerStore {
    server = $state<Server | null>(null);
    permissions = $state<string[]>([]);

    /** Power state, maintained from the socket's `status` event. */
    status = $state<ServerPowerState | null>(null);

    instance = $state<Websocket | null>(null);
    connected = $state(false);

    /** Error strip rendered at the top of the page, mirroring WebsocketHandler's `error`. */
    banner = $state<SocketBanner>(null);

    /** Set once getServer() has either produced data or failed. */
    loadError = $state('');

    #uuid: string;
    #updatingToken = false;
    #disposers: (() => void)[] = [];

    constructor(identifier: string) {
        this.#uuid = identifier;
    }

    readonly inConflictState = $derived(
        this.server
            ? this.server.status !== null || this.server.isTransferring || this.server.isNodeUnderMaintenance
            : false,
    );

    readonly isInstalling = $derived(
        this.server?.status === 'installing' || this.server?.status === 'install_failed',
    );

    can(permission?: string | string[]): boolean {
        return hasServerPermission(this.permissions, permission);
    }

    async load() {
        this.loadError = '';
        try {
            const [server, permissions] = await getServer(this.#uuid);
            this.server = server;
            this.permissions = permissions;
        } catch (error) {
            console.error(error);
            this.loadError = (error as Error).message;
        }
    }

    /** Patches the server object; listeners use this for install/transfer state changes. */
    patchServer(patch: Partial<Server>) {
        if (!this.server) return;
        this.server = { ...this.server, ...patch };
    }

    async refetch() {
        try {
            const [server, permissions] = await getServer(this.#uuid);
            this.server = server;
            this.permissions = permissions;
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Opens the socket and wires the shared listeners, mirroring the legacy
     * WebsocketHandler: status tracking, token refresh and transfer reconnection.
     */
    connect() {
        if (this.instance) return;

        const socket = new Websocket();
        // The EventEmitter signatures are stringly-typed; the listeners below are all
        // single-argument, hence the loose cast at the boundary.
        const track = (event: string, listener: (...args: any[]) => void): (() => void) => {
            socket.on(event, listener);

            return () => socket.removeListener(event, listener);
        };

        const disposers = [
            track('auth success', () => {
                this.connected = true;
                this.banner = null;
            }),
            track('SOCKET_CLOSE', () => (this.connected = false)),
            track('SOCKET_CONNECT_ERROR', () => {
                this.banner = '多次尝试后仍无法连接到实例，请尝试刷新页面。';
            }),
            track('SOCKET_ERROR', () => {
                this.banner = 'connecting';
                this.connected = false;
            }),
            track('status', (status: ServerPowerState) => (this.status = status)),
            track('daemon error', (message: string) => {
                console.warn('Got error message from daemon socket:', message);
            }),
            track('token expiring', () => this.#updateToken(socket)),
            track('token expired', () => this.#updateToken(socket)),
            track('jwt error', (error: string) => {
                this.connected = false;
                console.warn('JWT validation error from wings:', error);

                if (RECONNECT_ERRORS.some(v => error.toLowerCase().indexOf(v) >= 0)) {
                    this.#updateToken(socket);
                } else {
                    this.banner = '验证 websocket 凭据时出错，请刷新页面。';
                }
            }),
            track('transfer status', (status: string) => {
                if (status === 'starting' || status === 'success') {
                    return;
                }

                // This code forces a reconnection to the websocket which will connect us to the
                // target node instead of the source node in order to be able to receive transfer
                // logs from the target node.
                socket.close();
                this.banner = 'connecting';
                this.connected = false;
                this.instance = null;
                this.connect();
            }),
        ];

        this.#disposers.push(...disposers);

        getWebsocketCredentials(this.#uuid)
            .then(data => {
                // Connect and then set the authentication token.
                socket.setToken(data.token).connect(data.socket);
                this.instance = socket;
            })
            .catch(error => console.error(error));
    }

    #updateToken(socket: Websocket) {
        if (this.#updatingToken) {
            return;
        }

        this.#updatingToken = true;
        getWebsocketCredentials(this.#uuid)
            .then(data => socket.setToken(data.token, true))
            .catch(error => console.error(error))
            .then(() => {
                this.#updatingToken = false;
            });
    }

    /** Tears the connection and listeners down when leaving the server page. */
    destroy() {
        for (const dispose of this.#disposers) dispose();
        this.#disposers = [];

        if (this.instance) {
            this.instance.removeAllListeners();
            this.instance.close();
        }

        this.instance = null;
        this.connected = false;
    }
}

const SERVER_STORE_KEY = Symbol('server-store');

/** Provides a fresh store for a server mount; call in the ServerArea root. */
export function provideServerStore(identifier: string): ServerStore {
    const store = new ServerStore(identifier);
    setContext(SERVER_STORE_KEY, store);

    return store;
}

/** Reads the store of the enclosing server mount. */
export function useServerStore(): ServerStore {
    const store = getContext<ServerStore>(SERVER_STORE_KEY);
    if (!store) throw new Error('useServerStore must be used within a server page');

    return store;
}

/**
 * Subscribes to a socket event for the lifetime of the enclosing component, matching
 * the legacy `useWebsocketEvent`: the listener attaches once the socket is connected
 * and detaches on cleanup.
 */
export function websocketEvent(store: ServerStore, event: string, callback: (...args: never[]) => void) {
    $effect(() => {
        if (!store.connected || !store.instance) return;

        const listener = (...args: unknown[]) => (callback as (...a: unknown[]) => void)(...args);
        store.instance.addListener(event, listener as never);

        return () => {
            store.instance?.removeListener(event, listener as never);
        };
    });
}
