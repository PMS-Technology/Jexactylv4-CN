import { useStoreState } from 'easy-peasy';
import type { FormikHelpers } from 'formik';
import { Formik } from 'formik';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Reaptcha from 'reaptcha';
import tw from 'twin.macro';
import { object, string } from 'yup';
import { requestPasswordReset } from '@/api/routes/auth/password-reset';
import { httpErrorToHuman } from '@/api/http';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import { Button } from '@/elements/button';
import Field from '@/elements/Field';
import useFlash from '@/plugins/useFlash';

interface Values {
    email: string;
    code: string;
    password: string;
    password_confirm: string;
}

function ForgotPasswordContainer() {
    const { t } = useTranslation('auth');
    const ref = useRef<Reaptcha>(null);
    const token = useRef('');

    const { clearFlashes, addFlash } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState(state => state.settings.data!.recaptcha);

    useEffect(() => {
        clearFlashes();
    }, []);

    const handleSubmission = (
        { email, code, password, password_confirm }: Values,
        { setSubmitting, resetForm }: FormikHelpers<Values>,
    ) => {
        clearFlashes();

        if (recaptchaEnabled && !token) {
            ref.current!.execute().catch(error => {
                console.error(error);

                setSubmitting(false);
                addFlash({ type: 'error', title: t('error.title', { ns: 'common' }) as string, message: httpErrorToHuman(error) });
            });

            return;
        }

        requestPasswordReset(email, code, password, password_confirm, token.current)
            .then(response => {
                resetForm();
                addFlash({ type: 'success', title: 'Success', message: response });
            })
            .catch(error => {
                console.error(error);
                addFlash({ type: 'error', title: t('error.title', { ns: 'common' }) as string, message: httpErrorToHuman(error) });
            })
            .then(() => {
                token.current = '';
                if (ref.current !== null) {
                    void ref.current.reset();
                }

                setSubmitting(false);
            });
    };

    return (
        <Formik
            onSubmit={handleSubmission}
            initialValues={{ email: '', code: '', password: '', password_confirm: '' }}
            validationSchema={object().shape({
                email: string()
                    .email(t('forgotPassword.emailRequired') as string)
                    .required(t('forgotPassword.emailRequired') as string),
                code: string().required(t('forgotPassword.codeRequired') as string),
                password: string().min(8).required(),
                password_confirm: string().min(8).required(),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <LoginFormContainer title={t('forgotPassword.title') as string} css={tw`w-full flex`}>
                    <Field
                        label={t('forgotPassword.emailAddress') as string}
                        description={t('forgotPassword.emailDesc') as string}
                        name={'email'}
                        type={'email'}
                    />
                    <div className={'mt-6'}>
                        <Field
                            label={t('forgotPassword.recoveryCode') as string}
                            description={t('forgotPassword.recoveryCodeDesc') as string}
                            name={'code'}
                            type={'text'}
                        />
                    </div>
                    <div className={'my-6'}>
                        <Field
                            label={t('forgotPassword.newPassword') as string}
                            description={t('forgotPassword.newPasswordDesc') as string}
                            name={'password'}
                            type={'password'}
                        />
                    </div>
                    <Field
                        label={t('forgotPassword.confirmNewPassword') as string}
                        description={t('forgotPassword.confirmNewPasswordDesc') as string}
                        name={'password_confirm'}
                        type={'password'}
                    />
                    <div css={tw`mt-6`}>
                        <Button type={'submit'} className={'w-full'} size={Button.Sizes.Large} disabled={isSubmitting}>
                            {t('forgotPassword.attemptLogin') as string}
                        </Button>
                    </div>
                    {recaptchaEnabled && (
                        <Reaptcha
                            ref={ref}
                            size={'invisible'}
                            sitekey={siteKey || '_invalid_key'}
                            onVerify={response => {
                                token.current = response;
                                void submitForm();
                            }}
                            onExpire={() => {
                                setSubmitting(false);
                                token.current = '';
                            }}
                        />
                    )}
                    <div css={tw`mt-6 text-center`}>
                        <Link
                            to={'/auth/login'}
                            css={tw`text-xs text-neutral-300 tracking-wide no-underline uppercase font-medium hover:text-neutral-600`}
                        >
                            {t('forgotPassword.returnToLogin') as string}
                        </Link>
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
}

export default ForgotPasswordContainer;
