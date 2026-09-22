import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import tw from 'twin.macro';
import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import {
    faArrowRight,
    faChartLine,
    faCoins,
    faDatabase,
    faDesktop,
    faHeart,
    faLayerGroup,
    faQuestionCircle,
    faRecycle,
    faSave,
    faServer,
    faTicket,
    faUserPlus,
    faUsers,
    IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import AdminBox from '@/elements/AdminBox';
import Spinner from '@/elements/Spinner';
import CopyOnClick from '@/elements/CopyOnClick';
import { useStoreState } from '@/state/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { Alert } from '@/elements/alert';
import getMetrics, { MetricData } from '@/api/routes/admin/getMetrics';
import getVersion, { VersionData } from '@/api/routes/admin/getVersion';
import { useTranslation } from 'react-i18next';

interface SuggestionProps {
    icon: IconDefinition;
    title: string;
    description: string;
    link: string;
    action?: string;
}

const Code = ({ children }: { children: ReactNode }) => {
    return (
        <code css={tw`text-sm font-mono bg-neutral-900 rounded`} style={{ padding: '2px 6px' }}>
            {children}
        </code>
    );
};

const SuggestionCard = ({ icon, title, description, link, action }: SuggestionProps) => {
    const { colors } = useStoreState(state => state.theme.data!);
    const { t } = useTranslation('admin');

    return (
        <div className={'bg-black/25 p-3 lg:p-6 rounded-lg'}>
            <h1 className={'text-xl font-semibold mb-2'}>
                <FontAwesomeIcon icon={icon} /> {title}
            </h1>
            <p className={'text-gray-300'}>{description}</p>
            <p className={'mt-2 text-right text-sm'} style={{ color: colors.primary }}>
                <Link to={link}>
                    {action ?? t('overview.manage')} <FontAwesomeIcon icon={faArrowRight} />
                </Link>
            </p>
        </div>
    );
};

interface StatProps {
    icon: IconDefinition;
    title: string;
    value: ReactNode;
    subtext?: string;
}

const StatCard = ({ icon, title, value, subtext }: StatProps) => {
    const { colors } = useStoreState(state => state.theme.data!);

    return (
        <div className={'bg-black/25 p-3 lg:p-4 rounded-lg'}>
            <p className={'text-sm text-gray-400'}>
                <FontAwesomeIcon icon={icon} style={{ color: colors.primary }} /> {title}
            </p>
            <p className={'text-2xl font-semibold mt-1'}>{value}</p>
            {subtext && <p className={'text-xs text-gray-400 mt-1'}>{subtext}</p>}
        </div>
    );
};

export default () => {
    const { t } = useTranslation('admin');
    const [loading, setLoading] = useState<boolean>(true);
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const everest = useStoreState(state => state.everest.data!);
    const settings = useStoreState(state => state.settings.data!);

    const [metricData, setMetricData] = useState<MetricData | undefined>(undefined);
    const [versionData, setVersionData] = useState<VersionData | undefined>(undefined);

    useEffect(() => {
        clearFlashes('overview');

        getVersion()
            .then(versionData => setVersionData(versionData))
            .catch(error => {
                clearAndAddHttpError({ key: 'overview', error });
            })
            .then(() => setLoading(false));

        getMetrics()
            .then(metricData => setMetricData(metricData))
            .catch(error => {
                clearAndAddHttpError({ key: 'overview', error });
            });
    }, []);

    return (
        <AdminContentBlock title={t('nav.overview')}>
            <div css={tw`w-full flex flex-row items-center mb-8`}>
                <div css={tw`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 css={tw`text-2xl text-neutral-50 font-header font-medium`}>{t('nav.overview')}</h2>
                    <p
                        css={tw`hidden md:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {t('overview.quickGlance')}
                    </p>
                </div>
            </div>

            <FlashMessageRender byKey={'overview'} css={tw`mb-4`} />

            <AdminBox title={t('overview.versionInfo')} icon={faDesktop}>
                {settings.debug && (
                    <Alert type={'warning'} className={'mb-3'}>
                        {t('overview.debugModeWarning')}
                    </Alert>
                )}
                {loading ? (
                    <Spinner size={'large'} centered />
                ) : (
                    <>
                        <div className={'text-gray-200 mb-2'}>
                            {t('overview.runningVersion')}&nbsp;
                            <CopyOnClick text={versionData?.panel.current}>
                                <Code>{versionData?.panel.current}</Code>
                            </CopyOnClick>
                            , {t('overview.latestVersion')}&nbsp;
                            <CopyOnClick text={versionData?.panel.latest}>
                                <Code>{versionData?.panel.latest}</Code>
                            </CopyOnClick>
                            .
                        </div>
                        {versionData?.panel.current.startsWith('v4.0.0-') && (
                            <Alert type={'danger'} className={'mt-4'}>
                                {t('overview.betaWarning')}
                            </Alert>
                        )}
                    </>
                )}
            </AdminBox>
            <AdminBox title={t('overview.statistics')} className={'mt-6'} icon={faChartLine}>
                {loading || !metricData ? (
                    <Spinner size={'large'} centered />
                ) : (
                    <div className={'grid grid-cols-2 lg:grid-cols-4 gap-4'}>
                        <StatCard icon={faLayerGroup} title={t('nav.nodes')} value={metricData.nodes} />
                        <StatCard
                            icon={faServer}
                            title={t('nav.servers')}
                            value={metricData.servers.total}
                            subtext={
                                metricData.servers.suspended > 0 || metricData.servers.installing > 0
                                    ? [
                                          metricData.servers.suspended > 0
                                              ? t('overview.suspendedCount', { count: metricData.servers.suspended })
                                              : null,
                                          metricData.servers.installing > 0
                                              ? t('overview.installingCount', { count: metricData.servers.installing })
                                              : null,
                                      ]
                                          .filter(Boolean)
                                          .join(', ')
                                    : undefined
                            }
                        />
                        <StatCard
                            icon={faUsers}
                            title={t('nav.users')}
                            value={metricData.users.total}
                            subtext={t('overview.administratorsCount', { count: metricData.users.admins })}
                        />
                        <StatCard icon={faTicket} title={t('overview.pendingTickets')} value={metricData.tickets} />
                        <StatCard icon={faDatabase} title={t('nav.databases')} value={metricData.databases} />
                        <StatCard icon={faSave} title={t('overview.backups')} value={metricData.backups} />
                        {metricData.billing && (
                            <>
                                <StatCard
                                    icon={faCoins}
                                    title={t('overview.revenue')}
                                    value={`${everest.billing.currency.symbol}${metricData.billing.revenue.toFixed(2)}`}
                                    subtext={t('overview.ordersThisMonth', {
                                        count: metricData.billing.orders_this_month,
                                    })}
                                />
                                <StatCard
                                    icon={faQuestionCircle}
                                    title={t('overview.pendingOrders')}
                                    value={metricData.billing.orders_pending}
                                    subtext={t('overview.productsAvailable', { count: metricData.billing.products })}
                                />
                            </>
                        )}
                    </div>
                )}
            </AdminBox>
            <AdminBox title={t('overview.suggestedActions')} className={'mt-6'} icon={faQuestionCircle}>
                <div className={'grid lg:grid-cols-3 gap-4'}>
                    {!settings.auto_update && (
                        <SuggestionCard
                            icon={faRecycle}
                            link={'/admin/settings'}
                            title={t('overview.enableAutoUpdates')}
                            description={t('overview.enableAutoUpdatesDesc')}
                        />
                    )}
                    {!everest.auth.registration.enabled && (
                        <SuggestionCard
                            icon={faUserPlus}
                            link={'/admin/auth'}
                            title={t('overview.allowRegistration')}
                            description={t('overview.allowRegistrationDesc')}
                        />
                    )}
                    {metricData && (
                        <>
                            {metricData.nodes < 1 && (
                                <SuggestionCard
                                    icon={faLayerGroup}
                                    link={'/admin/nodes/new'}
                                    title={t('overview.addFirstNode')}
                                    description={t('overview.addFirstNodeDesc')}
                                />
                            )}
                            {metricData.servers.total < 1 && (
                                <SuggestionCard
                                    icon={faServer}
                                    link={'/admin/servers/new'}
                                    title={t('overview.createFirstServer')}
                                    description={t('overview.createFirstServerDesc')}
                                />
                            )}
                            {everest.tickets.enabled && metricData.tickets > 0 && (
                                <SuggestionCard
                                    icon={faTicket}
                                    link={'/admin/tickets'}
                                    title={t('overview.answerTickets')}
                                    description={t('overview.pendingTicketsCount', { count: metricData.tickets })}
                                />
                            )}
                            {metricData.billing && metricData.billing.orders_pending > 0 && (
                                <SuggestionCard
                                    icon={faCoins}
                                    link={'/admin/billing/orders'}
                                    title={t('overview.reviewPendingOrders')}
                                    description={t('overview.pendingOrdersCount', {
                                        count: metricData.billing.orders_pending,
                                    })}
                                />
                            )}
                        </>
                    )}
                    <SuggestionCard
                        icon={faHeart}
                        link={'https://donate.stripe.com/6oE02Zftd9cC34IbIS'}
                        title={t('overview.donateToJexactyl')}
                        action={t('overview.donate')}
                        description={t('overview.donateDesc')}
                    />
                </div>
            </AdminBox>
        </AdminContentBlock>
    );
};
