import { useContext, useEffect, useState } from 'react';
import * as React from 'react';
import { Dialog, DialogWrapperContext } from '@/elements/dialog';
import { getTwoFactorTokenData } from '@/api/routes/account/two-factor';
import { useFlashKey } from '@/plugins/useFlash';
import tw from 'twin.macro';
import QRCode from 'qrcode.react';
import { Button } from '@/elements/button/index';
import Spinner from '@/elements/Spinner';
import { Input } from '@/elements/inputs';
import CopyOnClick from '@/elements/CopyOnClick';
import Tooltip from '@/elements/tooltip/Tooltip';
import { enableTwoFactor } from '@/api/routes/account/two-factor';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import asDialog from '@/hoc/asDialog';
import { useTranslation } from 'react-i18next';

interface Props {
    onTokens: (tokens: string[]) => void;
}

const ConfigureTwoFactorForm = ({ onTokens }: Props) => {
    const { t } = useTranslation('dashboard');
    const [submitting, setSubmitting] = useState(false);
    const [value, setValue] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState<{ image_url_data: string; secret: string } | null>(null);
    const { clearAndAddHttpError } = useFlashKey('account:two-step');
    const updateUserData = useStoreActions((actions: Actions<ApplicationStore>) => actions.user.updateUserData);

    const { close, setProps } = useContext(DialogWrapperContext);

    useEffect(() => {
        getTwoFactorTokenData()
            .then(setToken)
            .catch(error => clearAndAddHttpError(error));
    }, []);

    useEffect(() => {
        setProps(state => ({
            ...state,
            title: t('account.enableTwoStepTitle'),
            description: t('account.enableTwoStepDescription'),
            preventExternalClose: submitting,
        }));
    }, [submitting, t]);

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();

        if (submitting) return;

        setSubmitting(true);
        clearAndAddHttpError();
        enableTwoFactor(value, password)
            .then(tokens => {
                updateUserData({ useTotp: true });
                onTokens(tokens);
            })
            .catch(error => {
                clearAndAddHttpError(error);
                setSubmitting(false);
            });
    };

    return (
        <form id={'enable-totp-form'} onSubmit={submit}>
            <FlashMessageRender byKey={'account:two-step'} className={'mt-4'} />
            <div className={'mx-auto mt-6 flex h-56 w-56 items-center justify-center bg-slate-50 p-2 shadow'}>
                {!token ? (
                    <Spinner />
                ) : (
                    <QRCode renderAs={'svg'} value={token.image_url_data} css={tw`w-full h-full shadow-none`} />
                )}
            </div>
            <CopyOnClick text={token?.secret}>
                <p className={'mt-2 text-center font-mono text-sm text-slate-100'}>
                    {token?.secret.match(/.{1,4}/g)!.join(' ') || t('account.loading')}
                </p>
            </CopyOnClick>
            <p id={'totp-code-description'} className={'mt-6'}>
                {t('account.scanQrCode')}
            </p>
            <Input.Text
                aria-labelledby={'totp-code-description'}
                variant={Input.Text.Variants.Loose}
                value={value}
                onChange={e => setValue(e.currentTarget.value)}
                className={'mt-3'}
                placeholder={'000000'}
                type={'text'}
                inputMode={'numeric'}
                autoComplete={'one-time-code'}
                pattern={'\\d{6}'}
            />
            <label htmlFor={'totp-password'} className={'mt-3 block'}>
                {t('account.accountPassword')}
            </label>
            <Input.Text
                variant={Input.Text.Variants.Loose}
                className={'mt-1'}
                type={'password'}
                value={password}
                onChange={e => setPassword(e.currentTarget.value)}
            />
            <Dialog.Footer>
                <Button.Text onClick={close}>{t('account.cancel')}</Button.Text>
                <Tooltip
                    disabled={password.length > 0 && value.length === 6}
                    content={
                        !token
                            ? t('account.waitingForQr')
                            : t('account.twoStepCodeAndPasswordRequired')
                    }
                    delay={100}
                >
                    <Button
                        disabled={!token || value.length !== 6 || !password.length}
                        type={'submit'}
                        form={'enable-totp-form'}
                    >
                        {t('account.enable')}
                    </Button>
                </Tooltip>
            </Dialog.Footer>
        </form>
    );
};

export default asDialog({
    title: '',
    description: '',
})(ConfigureTwoFactorForm);
