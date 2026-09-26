import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSyncExternalStore } from 'react';
import { usePermissions } from '@/plugins/usePermissions';
import { ServerContext } from '@/state/server';
import { SocketEvent } from '@server/events';
import { createConsoleState } from './consoleState';
import ConsolePageLayout from './modrinth/ConsolePageLayout';
import './modrinth/theme.css';

export default () => {
    const { t } = useTranslation('server');
    const consoleState = useMemo(() => createConsoleState(), []);
    const lines = useSyncExternalStore(consoleState.subscribe, consoleState.getOutput, consoleState.getOutput);
    const { connected, instance } = ServerContext.useStoreState(state => state.socket);
    const [canSendCommands] = usePermissions(['control.console']);
    const status = ServerContext.useStoreState(state => state.status.value);
    const isTransferring = ServerContext.useStoreState(state => state.server.data!.isTransferring);

    useEffect(() => {
        if (!connected || !instance) return;
        const prelude = (line: string) => `\u001b[1m\u001b[33m${line}\u001b[0m`;
        const listeners: Record<string, (value: string) => void> = {
            [SocketEvent.CONSOLE_OUTPUT]: line => consoleState.addLegacyLog(line),
            [SocketEvent.INSTALL_OUTPUT]: line => consoleState.addLegacyLog(line),
            [SocketEvent.TRANSFER_LOGS]: line => consoleState.addLegacyLog(line),
            [SocketEvent.DAEMON_MESSAGE]: line => consoleState.addLegacyLog(prelude(line)),
            [SocketEvent.DAEMON_ERROR]: line => consoleState.addLegacyLog(`\u001b[1m\u001b[41m${line}\u001b[0m`),
            [SocketEvent.STATUS]: state =>
                consoleState.addLegacyLog(prelude(t('consolePage.serverMarked', { status: state }))),
            [SocketEvent.TRANSFER_STATUS]: state => {
                if (state === 'failure') consoleState.addLegacyLog(prelude(t('consolePage.transferFailed')));
            },
        };
        if (!isTransferring) consoleState.clear();
        Object.entries(listeners).forEach(([key, listener]) => instance.addListener(key, listener));
        instance.send('send logs');
        return () => {
            Object.entries(listeners).forEach(([key, listener]) => instance.removeListener(key, listener));
        };
    }, [connected, consoleState, instance, isTransferring, t]);

    // The heading and toolbar live inside the console card itself, so this wrapper only has to
    // hand the card its height: the page grid supplies it on large screens, and the card's own
    // minimum takes over once the layout stacks on smaller screens.
    return (
        <div className={'modrinth-console relative flex min-h-0 w-full select-none flex-col'}>
            <div className={'flex min-h-0 flex-1 flex-col'}>
                <ConsolePageLayout
                    lines={lines}
                    consoleState={consoleState}
                    sendCommand={command => instance?.send('send command', command)}
                    showCommandInput={!!canSendCommands}
                    disableCommandInput={!canSendCommands || status !== 'running'}
                    loading={!connected}
                    clearDisabled={!canSendCommands}
                    shareDisabled={!connected}
                    onClear={() => consoleState.clear()}
                />
            </div>
        </div>
    );
};
