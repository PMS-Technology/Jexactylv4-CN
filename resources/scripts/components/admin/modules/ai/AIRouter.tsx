import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { CogIcon, SparklesIcon } from '@heroicons/react/outline';
import AdminContentBlock from '@/elements/AdminContentBlock';
import { NotFound } from '@/elements/ScreenBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { SubNavigation, SubNavigationLink } from '@admin/SubNavigation';
import EnableAI from '@admin/modules/ai/EnableAI';
import OverviewContainer from '@admin/modules/ai/OverviewContainer';
import ConfigureAI from '@admin/modules/ai/ConfigureAI';
import SettingsContainer from './SettingsContainer';

export default () => {
    const { t } = useTranslation('admin');
    const settings = useStoreState(state => state.everest.data!.ai);

    if (!settings.enabled) return <EnableAI />;
    if (settings.enabled && !settings.key) return <ConfigureAI />;

    return (
        <AdminContentBlock title={t('aiModule.title') as string}>
            <FlashMessageRender byKey={'admin:ai'} className={'mb-4'} />
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('aiModule.title') as string}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('aiModule.description') as string}
                    </p>
                </div>
            </div>
            <SubNavigation>
                <SubNavigationLink to={'/admin/ai'} name={t('aiModule.general') as string} base>
                    <SparklesIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/ai/settings'} name={t('aiModule.options') as string}>
                    <CogIcon />
                </SubNavigationLink>
            </SubNavigation>
            <Routes>
                <Route path={'/'} element={<OverviewContainer />} />
                <Route path={'/settings'} element={<SettingsContainer />} />

                <Route path={'/*'} element={<NotFound />} />
            </Routes>
        </AdminContentBlock>
    );
};
