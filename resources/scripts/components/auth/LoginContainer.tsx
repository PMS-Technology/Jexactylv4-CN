import { useStoreState } from 'easy-peasy';
import type { FormikHelpers } from 'formik';
import { Formik } from 'formik';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Reaptcha from 'reaptcha';
import tw from 'twin.macro';
import { object, string } from 'yup';

import { login, externalLogin } from '@/api/routes/auth/login';
import LoginFormContainer from '@/components/auth/LoginFormContainer';
import Field from '@/elements/Field';
import { Button } from '@/elements/button';
import useFlash from '@/plugins/useFlash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord, faGoogle } from '@fortawesome/free-brands-svg-icons';
import Label from '@/elements/Label';
import { faAt, faEnvelope, faKey } from '@fortawesome/free-solid-svg-icons';

interface Values {
    username: string;
    password: string;
}

function LoginContainer() {
    const { t } = useTranslation('auth');
    const ref = useRef<Reaptcha>(null);
    const token = useRef('');

    const appName = useStoreState(state => state.settings.data!.name);
    const modules = useStoreState(state => state.everest.data!.auth.modules);
    const registration = useStoreState(state => state.everest.data!.auth.registration.enabled);

    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { enabled: recaptchaEnabled, siteKey } = useStoreState(state => state.settings.data!.recaptcha);

    const navigate = useNavigate();

    useEffect(() => {
        clearFlashes();
    }, []);

    const useOauth = (name: string) => {
        if (recaptchaEnabled && !token.current) {
            ref.current!.execute().catch(error => {
                console.error(error);

                clearAndAddHttpError({ error });
            });

            return;
        }

        externalLogin(name, token.current)
            .then(url => {
                // @ts-expect-error this is fine
                window.location = url;
            })
            .catch(error => clearAndAddHttpError({ key: 'auth:register', error }));
    };

    const onSubmit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes();

        if (recaptchaEnabled && !token.current) {
            ref.current!.execute().catch(error => {
                console.error(error);

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });

            return;
        }

        login({ ...values, recaptchaData: token.current })
            .then(response => {
                if (response.complete) {
                    // @ts-expect-error this is valid
                    window.location = response.intended || '/';
                    return;
                }

                navigate('/auth/login/checkpoint', { state: { token: response.confirmationToken } });
            })
            .catch(error => {
                console.error(error);

                token.current = '';
                if (ref.current) ref.current.reset();

                setSubmitting(false);
                clearAndAddHttpError({ error });
            });
    };

    return (
        <Formik
            onSubmit={onSubmit}
            initialValues={{ username: '', password: '' }}
            validationSchema={object().shape({
                username: string().required(t('login.usernameRequired') as string),
                password: string().required(t('login.passwordRequired') as string),
            })}
        >
            {({ isSubmitting, setSubmitting, submitForm }) => (
                <LoginFormContainer title={t('login.title', { appName }) as string}>
                    <Field
                        icon={faAt}
                        type={'text'}
                        label={t('login.usernameOrEmail') as string}
                        name={'username'}
                        disabled={isSubmitting}
                        placeholder={'user@jexpanel.com'}
                    />
                    <div css={tw`mt-6`}>
                        <Label>
                            {t('login.password') as string}
                            <Link
                                to={'/auth/password'}
                                tabIndex={-1}
                                className={'ml-1 text-green-400 hover:text-green-200 duration-300 text-xs'}
                            >
                                {t('login.forgotPassword') as string}
                            </Link>
                        </Label>
                        <Field
                            icon={faKey}
                            type={'password'}
                            name={'password'}
                            disabled={isSubmitting}
                            placeholder={'••••••••••••'}
                        />
                    </div>
                    <div css={tw`mt-6`}>
                        <Button
                            type={'submit'}
                            loading={isSubmitting}
                            className={'w-full'}
                            size={Button.Sizes.Large}
                            disabled={isSubmitting}
                        >
                            {t('login.loginButton') as string}
                        </Button>
                    </div>
                    {recaptchaEnabled && (
                        <Reaptcha
                            ref={ref}
                            size={'invisible'}
                            sitekey={siteKey || '_invalid_key'}
                            onVerify={response => {
                                token.current = response;
                                submitForm();
                            }}
                            onExpire={() => {
                                setSubmitting(false);
                                token.current = '';
                            }}
                        />
                    )}
                    {(modules.discord.enabled || modules.google.enabled || registration) && (
                        <div className={'w-full text-center my-3 text-gray-400'}>{t('login.or') as string}</div>
                    )}
                    <div className={'mt-4 w-full grid gap-4 grid-cols-2'}>
                        {modules.discord.enabled && (
                            <Button.Info type={'button'} onClick={() => useOauth('discord')} size={Button.Sizes.Small}>
                                <FontAwesomeIcon icon={faDiscord} className={'mr-2 my-auto'} /> {t('login.useDiscordSSO') as string}
                            </Button.Info>
                        )}
                        {modules.google.enabled && (
                            <Button.Text type={'button'} onClick={() => useOauth('google')} size={Button.Sizes.Small}>
                                <FontAwesomeIcon icon={faGoogle} className={'mr-2 my-auto'} /> {t('login.useGoogleSSO') as string}
                            </Button.Text>
                        )}
                        {registration && (
                            <Button.Text
                                type={'button'}
                                onClick={() => navigate('/auth/register')}
                                size={Button.Sizes.Small}
                            >
                                <FontAwesomeIcon icon={faEnvelope} className={'mr-2 my-auto'} /> {t('login.registerWithEmail') as string}
                            </Button.Text>
                        )}
                    </div>
                </LoginFormContainer>
            )}
        </Formik>
    );
}

export default LoginContainer;
