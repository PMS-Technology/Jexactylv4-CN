import { updateSettings } from '@/api/routes/admin/ai';
import Input from '@/elements/Input';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import Tooltip from '@/elements/tooltip/Tooltip';
import { useFlashKey } from '@/plugins/useFlash';
import { Dialog } from '@/elements/dialog';
import { faCheckCircle, faExclamationTriangle, faExternalLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useStoreState } from 'easy-peasy';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/elements/button';

export default () => {
    const { t } = useTranslation('admin');
    const [key, setKey] = useState<string>();
    const settings = useStoreState(s => s.everest.data!.ai);
    const [loading, setLoading] = useState<boolean>(false);
    const { clearFlashes, clearAndAddHttpError } = useFlashKey('admin:ai');

    const submit = () => {
        clearFlashes();
        setLoading(true);

        updateSettings({ ...settings, key })
            .then(() => {
                window.location.reload();
            })
            .catch(error => clearAndAddHttpError(error));
    };

    return (
        <Dialog
            open
            onClose={() => undefined}
            preventExternalClose
            hideCloseIcon
            title={t('aiModule.configureJexactylAI')}
        >
            <SpinnerOverlay visible={loading} />
            <p className={'text-gray-400'}>{t('aiModule.configureDescription')}</p>
            <p className={'text-gray-400 my-2'}>
                {t('aiModule.configureKeyHelpPrefix')}{' '}
                <a
                    href={'https://opencode.ai/docs/providers/'}
                    rel={'noreferrer'}
                    target={'_blank'}
                    className={'text-blue-400'}
                >
                    {t('aiModule.providerDocumentation')}
                    <FontAwesomeIcon icon={faExternalLink} className={'mb-1.5 ml-0.5 h-2 w-2'} />
                </a>
                &nbsp;{t('aiModule.configureKeyHelpSuffix')}
            </p>
            <div className={'relative'}>
                <Input
                    placeholder={t('aiModule.enterApiKey') as string}
                    onChange={e => setKey(e.currentTarget.value)}
                />
                {!key ? (
                    <Tooltip placement={'right'} content={t('aiModule.invalidApiKey')}>
                        <FontAwesomeIcon
                            icon={faExclamationTriangle}
                            className={'absolute top-1/3 right-4 text-yellow-500'}
                        />
                    </Tooltip>
                ) : (
                    <FontAwesomeIcon icon={faCheckCircle} className={'absolute top-1/3 right-4 text-green-500'} />
                )}
            </div>
            <div className={'flex justify-end mt-4'}>
                <Button onClick={submit} disabled={!key || loading}>
                    {t('aiModule.saveAndContinue')}
                </Button>
            </div>
        </Dialog>
    );
};
