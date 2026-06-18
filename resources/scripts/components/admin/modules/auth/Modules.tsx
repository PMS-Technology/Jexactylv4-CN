import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import Box from '@/components/admin/modules/auth/Box';
import { faDoorOpen, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { faDiscord, faGoogle } from '@fortawesome/free-brands-svg-icons';

export default () => {
    const { t } = useTranslation('admin');
    const modules = useStoreState(state => state.everest.data!.auth.modules);
    /**
     * Everest - Authentication Extensions
     *
     * name (string, required): The name for this extension. This MUST match the other files for this extension.
     * icon (IconDefinition, optional): The icon for this extension. This can be left blank.
     * title (string, required): The user-friendly name for this extension.
     * description (string, required): A short description on what this extension has to offer.
     *
     */
    return (
        <>
            <FlashMessageRender byKey={'auth:modules'} />
            <Box
                icon={faDoorOpen}
                name={'onboarding'}
                title={t('authModule.onboardingTitle') as string}
                disabled={modules.onboarding.enabled}
                recommended={
                    t('authModule.onboardingRecommended') as string
                }
                description={
                    t('authModule.onboardingDescription') as string
                }
            />
            <Box
                name={'jguard'}
                icon={faShieldHalved}
                title={t('authModule.jguardTitle') as string}
                disabled={modules.jguard.enabled}
                description={t('authModule.jguardDescription') as string}
            />
            <Box
                name={'discord'}
                icon={faDiscord}
                title={t('authModule.discordTitle') as string}
                disabled={modules.discord.enabled}
                description={t('authModule.discordDescription') as string}
            />
            <Box
                name={'google'}
                icon={faGoogle}
                title={t('authModule.googleTitle') as string}
                disabled={modules.google.enabled}
                description={t('authModule.googleDescription') as string}
            />
        </>
    );
};
