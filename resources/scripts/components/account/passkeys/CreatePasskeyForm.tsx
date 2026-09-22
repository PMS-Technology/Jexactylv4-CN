import { Field, Form, Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import { useStoreState } from 'easy-peasy';
import tw from 'twin.macro';

import FormikFieldWrapper from '@/elements/FormikFieldWrapper';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import { Button } from '@/elements/button';
import Input from '@/elements/Input';
import { useFlashKey } from '@/plugins/useFlash';
import { createPasskey, usePasskeys } from '@/api/routes/account/passkeys';
import { passkeysSupported, isPasskeyCancellation } from '@/api/routes/auth/passkey';
import { useTranslation } from 'react-i18next';

interface Values {
    name: string;
    password: string;
}

export default () => {
    const { t } = useTranslation('dashboard');
    const { clearAndAddHttpError } = useFlashKey('account');
    const { mutate } = usePasskeys();

    // Accounts created through an SSO module have no password to confirm against.
    const hasPassword = useStoreState(state => state.user.data!.hasPassword);

    const submit = (values: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearAndAddHttpError();

        createPasskey(values.name, hasPassword ? values.password : undefined)
            .then(passkey => {
                resetForm();
                mutate(data => (data || []).concat(passkey));
            })
            .catch(error => {
                if (!isPasskeyCancellation(error)) clearAndAddHttpError(error);
            })
            .then(() => setSubmitting(false));
    };

    if (!passkeysSupported()) {
        return <p css={tw`text-sm`}>{t('account.passkeys.unsupported')}</p>;
    }

    return (
        <Formik
            onSubmit={submit}
            initialValues={{ name: '', password: '' }}
            validationSchema={object().shape({
                name: string().required(t('account.passkeys.nameRequired') as string),
                password: hasPassword
                    ? string().required(t('account.currentAccountPasswordRequired') as string)
                    : string(),
            })}
        >
            {({ isSubmitting }) => (
                <Form>
                    <SpinnerOverlay visible={isSubmitting} />
                    <FormikFieldWrapper
                        label={t('account.passkeys.name')}
                        name={'name'}
                        description={t('account.passkeys.nameDescription')}
                        css={tw`mb-6`}
                    >
                        <Field name={'name'} as={Input} />
                    </FormikFieldWrapper>
                    {hasPassword && (
                        <FormikFieldWrapper label={t('account.currentPassword')} name={'password'}>
                            <Field name={'password'} type={'password'} as={Input} />
                        </FormikFieldWrapper>
                    )}
                    <p css={tw`text-xs text-gray-400 mt-6`}>{t('account.passkeys.confirmationDescription')}</p>
                    <div css={tw`flex justify-end mt-6`}>
                        <Button type={'submit'}>{t('account.passkeys.add')}</Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};
