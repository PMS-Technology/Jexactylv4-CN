import { AdjustmentsIcon, ChipIcon, LinkIcon, TerminalIcon } from '@heroicons/react/outline';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';

import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { SubNavigation, SubNavigationLink } from '@admin/SubNavigation';
import GeneralSettings from '@admin/general/settings/GeneralSettings';
import { useStoreState } from '@/state/hooks';
import ModeSettings from './ModeSettings';
import DebugSettings from './DebugSettings';

const SettingsRouter = () => {
    const { t } = useTranslation('admin');
    const appName = useStoreState(state => state.settings.data!.name);

    return (
        <AdminContentBlock title={t('settings.settings') as string}>
            <div css={tw`w-full flex flex-row items-center mb-8`}>
                <div css={tw`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 css={tw`text-2xl text-neutral-50 font-header font-medium`}>{t('settings.settings') as string}</h2>
                    <p
                        css={tw`hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {t('settings.configureFor', { name: appName }) as string}
                    </p>
                </div>
            </div>

            <FlashMessageRender byKey={'admin:settings'} css={tw`mb-4`} />

            <SubNavigation>
                <SubNavigationLink to="/admin/settings" name={t('settings.core') as string} base>
                    <ChipIcon />
                </SubNavigationLink>
                <SubNavigationLink to="/admin/settings/mode" name={t('settings.modes') as string}>
                    <AdjustmentsIcon />
                </SubNavigationLink>
                <SubNavigationLink to="/admin/settings/webhooks" name={t('settings.webhooks') as string}>
                    <LinkIcon />
                </SubNavigationLink>
                <SubNavigationLink to="/admin/settings/debug" name="Debug">
                    <TerminalIcon />
                </SubNavigationLink>
            </SubNavigation>

            <Routes>
                <Route path="/" element={<GeneralSettings />} />
                <Route path="/mode" element={<ModeSettings />} />
                <Route path="/debug" element={<DebugSettings />} />
            </Routes>
        </AdminContentBlock>
    );
};

export default SettingsRouter;
