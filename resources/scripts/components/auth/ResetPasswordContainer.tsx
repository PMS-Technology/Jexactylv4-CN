import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { performPasswordReset } from '@/api/routes/auth/password-reset';
import { httpErrorToHuman } from '@/api/http';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { Formik, FormikHelpers } from 'formik';
import { object, ref, string } from 'yup';
import Field from '@/elements/Field';
import Input from '@/elements/Input';
import tw from 'twin.macro';
import { Button } from '@/elements/button';
import Label from '@/elements/Label';

interface Values {
    password: string;
    passwordConfirmation: string;
}

function ResetPasswordContainer() {
    const { t } = useTranslation('auth');
    const [email, setEmail] = useState('');

    const { clearFlashes, addFlash } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    const parsed = new URLSearchParams(location.search);
    if (email.length === 0 && parsed.get('email')) {
        setEmail(parsed.get('email') || '');
    }

    const params = useParams<'token'>();

    const submit = ({ password, passwordConfirmation }: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();
        performPasswordReset(email, { token: params.token ?? '', password, passwordConfirmation })
            .then(() => {
                // @ts-expect-error this is valid
                window.location = '/';
            })
            .catch(error => {
                console.error(error);

                setSubmitting(false);
                addFlash({ type: 'error', title: t('error.title', { ns: 'common' }) as string, message: httpErrorToHuman(error) });
            });
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={{
                password: '',
                passwordConfirmation: '',
            }}
            validationSchema={object().shape({
                password: string()
                    .required(t('resetPassword.passwordRequired') as string)
                    .min(8, t('resetPassword.passwordMin') as string),
                passwordConfirmation: string()
                    .required(t('resetPassword.passwordMismatch') as string)
                    .oneOf([ref('password')], t('resetPassword.passwordMismatch') as string),
            })}
        >
            {({ isSubmitting }) => (
                <LoginFormContainer title={t('resetPassword.title') as string} css={tw`w-full flex`}>
                    <div>
                        <Label>{t('resetPassword.emailAddress') as string}</Label>
                        <Input value={email} disabled />
                    </div>
                    <div css={tw`mt-6`}>
                        <Field
                            label={t('resetPassword.newPassword') as string}
                            name={'password'}
                            type={'password'}
                            description={t('resetPassword.newPasswordDesc') as string}
                        />
                    </div>
                    <div css={tw`mt-6`}>
                        <Field label={t('resetPassword.confirmNewPassword') as string} name={'passwordConfirmation'} type={'password'} />
                    </div>
                    <div css={tw`mt-6`}>
                        <Button className={'w-full'} size={Button.Sizes.Large} type={'submit'} disabled={isSubmitting}>
                            {t('resetPassword.resetButton') as string}
                        </Button>
                    </div>
                    <div css={tw`mt-6 text-center`}>
                        <Link
                            to={'/auth/login'}
                            css={tw`text-xs text-neutral-300 tracking-wide no-underline uppercase font-medium hover:text-neutral-600`}
                        >
                            {t('resetPassword.returnToLogin') as string}
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
}

export default ResetPasswordContainer;
