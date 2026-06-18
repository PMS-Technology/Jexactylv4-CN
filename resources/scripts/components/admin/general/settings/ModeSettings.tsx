import useFlash from '@/plugins/useFlash';
import { PanelMode } from '@/state/settings';
import { useTranslation } from 'react-i18next';
import { Button } from '@/elements/button';
import FeatureContainer from '@/elements/FeatureContainer';
import { useStoreActions, useStoreState } from '@/state/hooks';
import PersonalModeSvg from '@/assets/images/themed/PersonalModeSvg';
import StandardModeSvg from '@/assets/images/themed/StandardMoveSvg';
import { faDesktop, faMoon, faTerminal } from '@fortawesome/free-solid-svg-icons';
import ServerSvg from '@/assets/images/themed/ServerSvg';
import { Dialog } from '@/elements/dialog';
import { useState } from 'react';
import { updateModeSettings } from '@/api/routes/admin/settings';

export default () => {
    const { t } = useTranslation('admin');
    const [warning, setWarning] = useState<boolean>(false);
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    const settings = useStoreState(state => state.settings.data!);
    const primary = useStoreState(state => state.theme.data!.colors.primary);
    const updateSettings = useStoreActions(actions => actions.settings.updateSettings);

    const updateMode = (mode: PanelMode) => {
        clearFlashes();

        updateModeSettings(mode)
            .then(() => {
                updateSettings({ mode: mode });

                addFlash({
                    key: 'settings:mode',
                    type: 'success',
                    message: t('settings.modeUpdated') as string,
                });
            })
            .catch(error => clearAndAddHttpError({ key: 'settings:mode', error }));
    };

    return (
        <>
            <Dialog open={warning} onClose={() => setWarning(false)} title={t('settings.debugModeTitle') as string}>
                {t('settings.debugModeInstructions') as string}
                <ul className={'my-4 text-gray-300'}>
                    <li>&bull; {t('settings.debugStep1') as string}</li>
                    <li className={'my-1'}>
                        &bull; {t('settings.debugStep2') as string} <code className={'bg-black/50 p-1 rounded-lg'}>/var/www/jexactyl</code>
                    </li>
                    <li className={'my-1'}>
                        &bull; {t('settings.debugStep3') as string} (<code className={'bg-black/50 p-1 rounded-lg'}>.env</code>)
                    </li>
                    <li className={'my-1'}>&bull; {t('settings.debugStep4') as string}</li>
                    <li className={'my-1'}>&bull; {t('settings.debugStep5') as string}</li>
                </ul>
            </Dialog>
            <FeatureContainer
                noHeight
                icon={faDesktop}
                title={t('settings.standardMode') as string}
                image={<StandardModeSvg color={primary} />}
            >
                {t('settings.standardModeDesc') as string}
                <p className={'text-right mt-2'}>
                    <Button disabled={settings.mode === 'standard'} onClick={() => updateMode('standard')}>
                        {settings.mode === 'standard' ? (t('settings.currentlyActive') as string) : (t('settings.enableNow') as string)}
                    </Button>
                </p>
            </FeatureContainer>
            <div className={'h-px bg-gray-700 rounded-full my-4'} />
            <FeatureContainer
                noHeight
                icon={faMoon}
                title={t('settings.personalMode') as string}
                image={<PersonalModeSvg color={primary} />}
            >
                {t('settings.personalModeDesc') as string}
                <p className={'text-right mt-2'}>
                    <Button disabled={settings.mode === 'personal'} onClick={() => updateMode('personal')}>
                        {settings.mode === 'personal' ? (t('settings.currentlyActive') as string) : (t('settings.enableNow') as string)}
                    </Button>
                </p>
            </FeatureContainer>
            <div className={'h-px bg-gray-700 rounded-full my-4'} />
            <FeatureContainer noHeight icon={faTerminal} title={t('settings.debugMode') as string} image={<ServerSvg color={primary} />}>
                {t('settings.debugModeDesc') as string}
                <p className={'text-right mt-2'}>
                    <Button onClick={() => setWarning(true)} disabled={settings.debug}>
                        {settings.debug ? (t('settings.currentlyActive') as string) : (t('settings.enableNow') as string)}
                    </Button>
                </p>
            </FeatureContainer>
        </>
    );
};
