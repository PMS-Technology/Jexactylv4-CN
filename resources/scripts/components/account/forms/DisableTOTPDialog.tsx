import { useContext, useEffect, useState } from 'react';
import * as React from 'react';
import asDialog from '@/hoc/asDialog';
import { Dialog, DialogWrapperContext } from '@/elements/dialog';
import { Button } from '@/elements/button/index';
import { Input } from '@/elements/inputs';
import Tooltip from '@/elements/tooltip/Tooltip';
import { disableTwoFactor } from '@/api/routes/account/two-factor';
import { useFlashKey } from '@/plugins/useFlash';
import { useStoreActions } from '@/state/hooks';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { useTranslation } from 'react-i18next';

const DisableTOTPDialog = () => {
    const { t } = useTranslation('dashboard');
    const [submitting, setSubmitting] = useState(false);
    const [password, setPassword] = useState('');
    const { clearAndAddHttpError } = useFlashKey('account:two-step');
    const { close, setProps } = useContext(DialogWrapperContext);
    const updateUserData = useStoreActions(actions => actions.user.updateUserData);

    useEffect(() => {
        setProps(state => ({
            ...state,
            title: t('account.disableTwoStepTitle'),
            description: t('account.disableTwoStepDescription'),
            preventExternalClose: submitting,
        }));
    }, [submitting, t]);

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (submitting) return;

        setSubmitting(true);
        clearAndAddHttpError();
        disableTwoFactor(password)
            .then(() => {
                updateUserData({ useTotp: false });
                close();
            })
            .catch(clearAndAddHttpError)
            .then(() => setSubmitting(false));
    };

    return (
        <form id={'disable-totp-form'} className={'mt-6'} onSubmit={submit}>
            <FlashMessageRender byKey={'account:two-step'} className={'-mt-2 mb-6'} />
            <label className={'block pb-1'} htmlFor={'totp-password'}>
                {t('account.password')}
            </label>
            <Input.Text
                id={'totp-password'}
                type={'password'}
                variant={Input.Text.Variants.Loose}
                value={password}
                onChange={e => setPassword(e.currentTarget.value)}
            />
            <Dialog.Footer>
                <Button.Text onClick={close}>{t('account.cancel')}</Button.Text>
                <Tooltip
                    delay={100}
                    disabled={password.length > 0}
                    content={t('account.passwordRequiredToContinue')}
                >
                    <Button.Danger type={'submit'} form={'disable-totp-form'} disabled={submitting || !password.length}>
                        {t('account.disable')}
                    </Button.Danger>
                </Tooltip>
            </Dialog.Footer>
        </form>
    );
};

export default asDialog({
    title: '',
    description: '',
})(DisableTOTPDialog);
