import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import isEqual from 'react-fast-compare';
import { Alert } from '@/elements/alert';
import Can from '@/elements/Can';
import Spinner from '@/elements/Spinner';
import Console from '@server/console/Console';
import PowerButtons from '@server/console/PowerButtons';
import ServerDetailsBlock from '@server/console/ServerDetailsBlock';
import StatGraphs from '@server/console/StatGraphs';
import Features from '@feature/Features';
import { ServerContext, ServerStatus } from '@/state/server';
import classNames from 'classnames';
import { useStoreState } from '@/state/hooks';
import Pill from '@/elements/Pill';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle, faDownload, faSpinner } from '@fortawesome/free-solid-svg-icons';
import EditServerDialog from './EditServerDialog';
import PageContentBlock from '@/elements/PageContentBlock';
import { timeUntil } from '../billing/ServerBillingContainer';

export type PowerAction = 'start' | 'stop' | 'restart' | 'kill';

function statusToColor(status: ServerStatus): string {
    switch (status) {
        case 'running':
            return 'text-green-500';
        case 'offline':
            return 'text-red-500';
        default:
            return 'text-yellow-500';
    }
}

function ServerConsoleContainer() {
    const { t } = useTranslation('server');
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const name = ServerContext.useStoreState(state => state.server.data!.name);
    const description = ServerContext.useStoreState(state => state.server.data!.description);
    const isInstalling = ServerContext.useStoreState(state => state.server.isInstalling);
    const isTransferring = ServerContext.useStoreState(state => state.server.data!.isTransferring);
    const eggFeatures = ServerContext.useStoreState(state => state.server.data!.eggFeatures, isEqual);
    const isNodeUnderMaintenance = ServerContext.useStoreState(state => state.server.data!.isNodeUnderMaintenance);
    const status = ServerContext.useStoreState(state => state.status.value);
    const renewalDate = ServerContext.useStoreState(state => state.server.data!.renewalDate);
    const billingProductId = ServerContext.useStoreState(state => state.server.data!.billingProductId);
    const settings = useStoreState(state => state.everest.data!.billing);

    const freeGraceDays = settings.renewal?.days || 7;

    const daysUntilRenewal = renewalDate
        ? Math.floor((new Date(renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const showRenewalWarning =
        billingProductId &&
        daysUntilRenewal !== null &&
        daysUntilRenewal <= 0 &&
        Math.abs(daysUntilRenewal) <= freeGraceDays;

    return (
        <PageContentBlock title={t('consolePage.title') as string} showFlashKey={'console:share'}>
            {showRenewalWarning && (
                <Alert type={'warning'} className={'mb-4'}>
                    {t('consolePage.renewalOverdue', { days: Math.abs(daysUntilRenewal!), freeGraceDays }) as string}
                </Alert>
            )}
            {(isNodeUnderMaintenance || isInstalling || isTransferring) && (
                <Alert type={'warning'} className={'mb-4'}>
                    {isNodeUnderMaintenance
                        ? (t('consolePage.nodeMaintenance') as string)
                        : isInstalling
                        ? (t('consolePage.installing') as string)
                        : (t('consolePage.transferring') as string)}
                </Alert>
            )}
            <div className={'mb-4 flex justify-between gap-4 bg-black/50 rounded-lg p-5'}>
                <div className={'hidden pr-4 sm:col-span-2 sm:block lg:col-span-3'}>
                    <div className={'flex items-center space-x-2'}>
                        <h1 className={'font-header text-2xl leading-relaxed text-slate-50 line-clamp-1'}>{name}</h1>
                        <Pill>
                            {isInstalling && (
                                <>
                                    <FontAwesomeIcon icon={faDownload} className={'my-auto mr-1'} />
                                    {t('consolePage.installingStatus') as string}
                                </>
                            )}
                            {isTransferring && (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} className={'animate-spin my-auto mr-1'} />
                                    {t('consolePage.transferringStatus') as string}
                                </>
                            )}
                            {!isInstalling && !isTransferring && (
                                <>
                                    <FontAwesomeIcon
                                        icon={faCircle}
                                        className={classNames('my-auto mr-1 w-2', statusToColor(status))}
                                    />
                                    {status}
                                </>
                            )}
                        </Pill>
                        <EditServerDialog />
                    </div>
                    <p className={'text-sm line-clamp-2'}>
                        {description ?? uuid}
                        {renewalDate && (
                            <span className={'ml-1'}>&bull; {t('consolePage.daysUntilRenewal', { days: timeUntil(renewalDate!).days }) as string}</span>
                        )}
                    </p>
                </div>
                <div className={'my-auto'}>
                    <Can action={['control.start', 'control.stop', 'control.restart']} matchAny>
                        <PowerButtons className={' flex space-x-2 sm:justify-center'} />
                    </Can>
                </div>
            </div>
            <ServerDetailsBlock className={'order-last col-span-4 lg:order-none lg:col-span-1'} />
            <div className={'mb-4 grid grid-cols-4 gap-2 sm:gap-4'}>
                <div className={'col-span-4 flex lg:col-span-3'}>
                    <Spinner.Suspense>
                        <Console />
                    </Spinner.Suspense>
                </div>
                <div className={'col-span-4 lg:col-span-1 my-auto'}>
                    <div className={'grid grid-cols-1 gap-2'}>
                        <Spinner.Suspense>
                            <StatGraphs />
                        </Spinner.Suspense>
                    </div>
                </div>
            </div>
            <Features enabled={eggFeatures} />
        </PageContentBlock>
    );
}

export default memo(ServerConsoleContainer, isEqual);
