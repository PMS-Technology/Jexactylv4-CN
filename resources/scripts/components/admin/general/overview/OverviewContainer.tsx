import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';
import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import {
    faArrowRight,
    faDesktop,
    faEye,
    faHeart,
    faLayerGroup,
    faQuestionCircle,
    faRecycle,
    faServer,
    faTicket,
    faUserPlus,
    IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import AdminBox from '@/elements/AdminBox';
import Spinner from '@/elements/Spinner';
import { useStoreState } from '@/state/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { Alert } from '@/elements/alert';
import getMetrics, { MetricData } from '@/api/routes/admin/getMetrics';
import getVersion, { VersionData } from '@/api/routes/admin/getVersion';
import ActivityContainer from './ActivityContainer';

interface SuggestionProps {
    icon: IconDefinition;
    title: string;
    description: string;
    link: string;
    action?: string;
}

const SuggestionCard = ({ icon, title, description, link, action }: SuggestionProps) => {
    const { t } = useTranslation('admin');
    const { colors } = useStoreState(state => state.theme.data!);

    return (
        <div className={'bg-black/25 p-3 lg:p-6 rounded-lg'}>
            <h1 className={'text-xl font-semibold mb-2'}>
                <FontAwesomeIcon icon={icon} /> {title}
            </h1>
            <p className={'text-gray-300'}>{description}</p>
            <p className={'mt-2 text-right text-sm'} style={{ color: colors.primary }}>
                <Link to={link}>
                    {action ?? (t('overview.manage') as string)} <FontAwesomeIcon icon={faArrowRight} />
                </Link>
            </p>
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
        <AdminContentBlock title={t('nav.overview') as string}>
            <div css={tw`w-full flex flex-row items-center mb-8`}>
                <div css={tw`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 css={tw`text-2xl text-neutral-50 font-header font-medium`}>{t('nav.overview') as string}</h2>
                    <p
                        css={tw`hidden md:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {t('overview.quickGlance') as string}
                    </p>
                </div>
            </div>

            <FlashMessageRender byKey={'overview'} css={tw`mb-4`} />

            <AdminBox title={t('overview.versionInfo') as string} icon={faDesktop}>
                {settings.debug && (
                    <Alert type={'warning'} className={'mb-3'}>
                        {t('overview.debugModeWarning') as string}
                    </Alert>
                )}
                {loading ? (
                    <Spinner size={'large'} centered />
                ) : (
                    <>
                        <div className={'text-gray-200 mb-2'}>
                            {t('overview.currentVersion', {
                                current: versionData?.panel.current,
                                latest: versionData?.panel.latest,
                            }) as string}
                        </div>
                        {versionData?.panel.current.startsWith('v4.0.0-') && (
                            <Alert type={'danger'} className={'mt-4'}>
                                {t('overview.betaWarning') as string}
                            </Alert>
                        )}
                    </>
                )}
            </AdminBox>
            <AdminBox title={t('overview.suggestedActions') as string} className={'mt-6'} icon={faQuestionCircle}>
                <div className={'grid lg:grid-cols-3 gap-4'}>
                    {!settings.auto_update && (
                        <SuggestionCard
                            icon={faRecycle}
                            link={'/admin/settings'}
                            title={t('overview.enableAutoUpdates') as string}
                            description={
                                t('overview.enableAutoUpdatesDesc') as string
                            }
                        />
                    )}
                    {!everest.auth.registration.enabled && (
                        <SuggestionCard
                            icon={faUserPlus}
                            link={'/admin/auth'}
                            title={t('overview.allowRegistration') as string}
                            description={
                                t('overview.allowRegistrationDesc') as string
                            }
                        />
                    )}
                    {metricData && (
                        <>
                            {metricData.nodes < 1 && (
                                <SuggestionCard
                                    icon={faLayerGroup}
                                    link={'/admin/nodes/new'}
                                    title={t('overview.addFirstNode') as string}
                                    description={t('overview.addFirstNodeDesc') as string}
                                />
                            )}
                            {metricData.servers < 1 && (
                                <SuggestionCard
                                    icon={faServer}
                                    link={'/admin/servers/new'}
                                    title={t('overview.createFirstServer') as string}
                                    description={t('overview.createFirstServerDesc') as string}
                                />
                            )}
                            {everest.tickets.enabled && metricData.tickets > 0 && (
                                <SuggestionCard
                                    icon={faTicket}
                                    link={'/admin/tickets'}
                                    title={t('overview.answerTickets') as string}
                                    description={t('overview.answerTicketsDesc', { count: metricData.tickets }) as string}
                                />
                            )}
                        </>
                    )}
                    <SuggestionCard
                        icon={faHeart}
                        link={'https://donate.stripe.com/6oE02Zftd9cC34IbIS'}
                        title={t('overview.donateToJexactyl') as string}
                        action={t('overview.donate') as string}
                        description={
                            t('overview.donateDesc') as string
                        }
                    />
                </div>
            </AdminBox>
            <AdminBox title={t('overview.adminActivity') as string} className={'mt-6'} icon={faEye}>
                <ActivityContainer />
            </AdminBox>
        </AdminContentBlock>
    );
};
