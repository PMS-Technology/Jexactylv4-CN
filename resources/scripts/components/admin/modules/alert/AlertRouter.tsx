import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { EyeIcon, ShieldExclamationIcon } from '@heroicons/react/outline';
import { SubNavigation, SubNavigationLink } from '@admin/SubNavigation';
import AlertSettings from './AlertSettings';
import AlertAppearance from './AlertAppearance';
import { NotFound } from '@/elements/ScreenBlock';

export default () => {
    const { t } = useTranslation('admin');
    return (
        <AdminContentBlock title={t('alertModule.title') as string}>
        <FlashMessageRender byKey={'admin:alert'} className={'mb-4'} />
        <div className={'w-full flex flex-row items-center mb-8'}>
            <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('alertModule.panelAlerts') as string}</h2>
                <p
                    className={
                        'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                    }
                >
                    {t('alertModule.description') as string}
                </p>
            </div>
        </div>
        <SubNavigation>
            <SubNavigationLink to={'/admin/alerts'} name={t('alertModule.general') as string} base>
                <ShieldExclamationIcon />
            </SubNavigationLink>
            <SubNavigationLink to={'/admin/alerts/view'} name={t('alertModule.appearance') as string}>
                <EyeIcon />
            </SubNavigationLink>
        </SubNavigation>
        <Routes>
            <Route path={'/'} element={<AlertSettings />} />
            <Route path={'/view'} element={<AlertAppearance />} />

            <Route path={'/*'} element={<NotFound />} />
        </Routes>
    </AdminContentBlock>
    );
};
