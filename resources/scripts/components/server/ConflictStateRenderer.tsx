import ServerInstallSvg from '@/assets/images/server_installing.svg';
import ServerErrorSvg from '@/assets/images/server_error.svg';
import ServerRestoreSvg from '@/assets/images/server_restore.svg';
import ScreenBlock from '@/elements/ScreenBlock';
import { ServerContext } from '@/state/server';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('server');
    const status = ServerContext.useStoreState(state => state.server.data?.status || null);
    const isTransferring = ServerContext.useStoreState(state => state.server.data?.isTransferring || false);
    const isNodeUnderMaintenance = ServerContext.useStoreState(
        state => state.server.data?.isNodeUnderMaintenance || false,
    );

    return status === 'installing' || status === 'install_failed' || status === 'reinstall_failed' ? (
        <ScreenBlock
            title={t('conflict.runningInstallerTitle') as string}
            image={ServerInstallSvg}
            message={t('conflict.runningInstallerMessage') as string}
        />
    ) : status === 'suspended' ? (
        <ScreenBlock
            title={t('conflict.serverSuspendedTitle') as string}
            image={ServerErrorSvg}
            message={t('conflict.serverSuspendedMessage') as string}
        />
    ) : isNodeUnderMaintenance ? (
        <ScreenBlock
            title={t('conflict.nodeMaintenanceTitle') as string}
            image={ServerErrorSvg}
            message={t('conflict.nodeMaintenanceMessage') as string}
        />
    ) : (
        <ScreenBlock
            title={isTransferring ? t('conflict.transferringTitle') as string : t('conflict.restoringTitle') as string}
            image={ServerRestoreSvg}
            message={
                isTransferring
                    ? t('conflict.transferringMessage') as string
                    : t('conflict.restoringMessage') as string
            }
        />
    );
};
