import { Form, Formik } from 'formik';
import { Button } from '@/elements/button';
import { useStoreState } from '@/state/hooks';
import Field from '@/elements/Field';
import { Dialog } from '@/elements/dialog';
import useFlash from '@/plugins/useFlash';
import FlashMessageRender from '../../elements/FlashMessageRender';
import { setupAccount } from '@/api/routes/account';
import { Alert } from '@/elements/alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('dashboard');
    const { t: tCommon } = useTranslation('common');
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const appName = useStoreState(state => state.settings.data!.name);
    const force2fa = useStoreState(state => state.everest.data!.auth.security.force2fa);
    const content = useStoreState(state => state.everest.data!.auth.modules.onboarding.content);

    const submit = (values: { username: string; password: string }) => {
        clearFlashes();

        setupAccount(values)
            .then(() => {
                // @ts-expect-error this is fine
                window.location = '/auth/login';
            })
            .catch(error => clearAndAddHttpError({ key: 'onboarding', error }));
    };

    return (
        <Dialog
            open={true}
            hideCloseIcon
            preventExternalClose
            onClose={() => undefined}
            title={`👋 ${t('welcomeTo', { name: appName.toString() })}`}
        >
            <FlashMessageRender byKey={'onboarding'} className={'my-3'} />
            <Formik onSubmit={submit} initialValues={{ username: '', password: '' }}>
                <Form>
                    <p className={'mt-2'}>{t('onboarding.missingDetails')}</p>
                    <p className={'text-sm text-gray-400'}>
                        {content ?? t('onboarding.changeLater')}
                    </p>
                    <div className={'my-6'}>
                        <Field
                            type={'text'}
                            id={'username'}
                            name={'username'}
                            label={t('onboarding.accountUsername') as string}
                            placeholder={'everestuser1'}
                        />
                        <p className={'text-xs text-gray-400 mt-2'}>
                            {t('onboarding.usernameDescription')}
                        </p>
                    </div>
                    <div className={'my-6'}>
                        <Field
                            id={'password'}
                            name={'password'}
                            type={'password'}
                            placeholder={'••••••••'}
                            label={t('onboarding.accountPassword') as string}
                        />
                        <p className={'text-xs text-gray-400 mt-2'}>
                            {t('onboarding.passwordDescription')}
                        </p>
                    </div>
                    {force2fa && (
                        <Alert type={'warning'} className={'my-6'}>
                            {t('onboarding.twoFactorRequired')}
                        </Alert>
                    )}
                    <div className={'flex w-full justify-between'}>
                        <p className={'my-auto text-xs text-gray-400'}>
                            <FontAwesomeIcon icon={faExclamationTriangle} className={'mr-1 text-yellow-600'} />
                            {t('onboarding.logoutWarning')}
                        </p>
                        <Button type={'submit'}>{tCommon('save')}</Button>
                    </div>
                </Form>
            </Formik>
        </Dialog>
    );
};
