import { Button } from '@/elements/button';
import { useTranslation } from 'react-i18next';
import { useStoreState } from '@/state/hooks';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowRight, faCheckCircle, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import ThemeSelect from './ThemeSelect';
import MigrationChecker from './MigrationChecker';
import ModeSelection from './ModeSelection';
import { finishSetup } from '@/api/setup';

export default () => {
    const { t } = useTranslation('admin');
    const [stage, setStage] = useState<number>(1);
    const { primary } = useStoreState(s => s.theme.data!.colors);
    const [fadeIn, setFadeIn] = useState(false);

    useEffect(() => {
        setFadeIn(true);
    }, []);

    const doFinish = () => {
        finishSetup().then(() => {
            window.location.reload();
        });
    };

    return (
        <div className={'min-h-screen static flex'}>
            <div
                className={`m-auto flex justify-center transition-opacity duration-1000 max-w-7xl ${
                    fadeIn ? 'opacity-100' : 'opacity-0'
                }`}
            >
                {stage === 1 && (
                    <div>
                        <h1 className={'text-5xl lg:text-8xl'}>
                            {t('setup.welcome') as string} <span style={{ color: primary }}>Jexactyl</span>
                        </h1>
                        <p className={'italic text-gray-400 text-center'}>
                            {t('setup.welcomeDescription') as string}
                        </p>
                    </div>
                )}
                {stage === 2 && <MigrationChecker />}
                {stage === 3 && <ThemeSelect defaultColor={primary} />}
                {stage === 4 && <ModeSelection />}
                {stage === 5 && (
                    <div>
                        <h1 className={'text-5xl lg:text-8xl'}>
                            {t('setup.thanks') as string} <span style={{ color: primary }}>Jexactyl</span>
                        </h1>
                        <p className={'italic text-gray-400 text-center'}>
                            {t('setup.thanksDescription') as string}
                        </p>
                    </div>
                )}
                <div className={'absolute bottom-12 right-12 space-x-2'}>
                    {stage > 1 ? (
                        <Button.Text onClick={() => setStage(stage - 1)} variant={Button.Variants.Secondary}>
                            {t('setup.goBack') as string} <FontAwesomeIcon icon={faArrowLeft} className={'ml-2 mt-1'} />
                        </Button.Text>
                    ) : (
                        <Button.Text onClick={doFinish} variant={Button.Variants.Secondary}>
                            {t('setup.skipSetup') as string} <FontAwesomeIcon icon={faXmark} className={'ml-2 mt-1'} />
                        </Button.Text>
                    )}
                    {stage < 5 ? (
                        <Button onClick={() => setStage(stage + 1)}>
                            {t('setup.continue') as string} <FontAwesomeIcon icon={faArrowRight} className={'ml-2 mt-1'} />
                        </Button>
                    ) : (
                        <Button onClick={doFinish}>
                            {t('setup.finish') as string} <FontAwesomeIcon icon={faCheckCircle} className={'ml-2 mt-1'} />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
