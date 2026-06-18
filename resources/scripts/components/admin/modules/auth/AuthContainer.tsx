import tw from 'twin.macro';
import { useTranslation } from 'react-i18next';
import AdminContentBlock from '@/elements/AdminContentBlock';
import Registration from '@admin/modules/auth/Registration';
import Security from './Security';
import { Button } from '@/elements/button';
import { useState } from 'react';
import { Dialog } from '@/elements/dialog';
import AuthModules from '@/components/admin/modules/auth/Modules';
import { useStoreState } from '@/state/hooks';
import DiscordSSO from './modules/DiscordSSO';
import Onboarding from '@admin/modules/auth/modules/Onboarding';
import GoogleSSO from './modules/GoogleSSO';
import JGuard from './modules/JGuard';

export default () => {
    const { t } = useTranslation('admin');
    const [visible, setVisible] = useState<boolean>(false);
    const modules = useStoreState(state => state.everest.data!.auth.modules);

    return (
            <AdminContentBlock title={t('authModule.title') as string}>
            {visible && (
                <Dialog title={t('authModule.addModules') as string} open={visible} onClose={() => setVisible(false)}>
                    <div className={'space-y-3'}>
                        <AuthModules />
                    </div>
                </Dialog>
            )}
            <div css={tw`w-full flex flex-row items-center mb-8`}>
                <div css={tw`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 css={tw`text-2xl text-neutral-50 font-header font-medium`}>{t('authModule.title') as string}</h2>
                    <p
                        css={tw`hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {t('authModule.description') as string}
                    </p>
                </div>
                <div css={tw`flex ml-auto pl-4`}>
                    <Button
                        type={'button'}
                        size={Button.Sizes.Large}
                        onClick={() => setVisible(true)}
                        css={tw`h-10 px-4 py-0 whitespace-nowrap`}
                    >
                        {t('authModule.addModule') as string}
                    </Button>
                </div>
            </div>
            <div className={'grid md:grid-cols-2 xl:grid-cols-3 gap-4'}>
                <Registration />
                <Security />
                {modules.onboarding.enabled && <Onboarding />}
                {modules.jguard.enabled && <JGuard />}
                {modules.discord.enabled && <DiscordSSO />}
                {modules.google.enabled && <GoogleSSO />}
            </div>
        </AdminContentBlock>
    );
};
