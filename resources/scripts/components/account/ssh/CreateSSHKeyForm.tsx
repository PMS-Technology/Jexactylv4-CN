import { Field, Form, Formik, FormikHelpers } from 'formik';
import { object, string } from 'yup';
import FormikFieldWrapper from '@/elements/FormikFieldWrapper';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import tw from 'twin.macro';
import { Button } from '@/elements/button';
import Input, { Textarea } from '@/elements/Input';
import styled from 'styled-components';
import { useFlashKey } from '@/plugins/useFlash';
import { createSSHKey, useSSHKeys } from '@/api/routes/account/ssh-keys';
import { useTranslation } from 'react-i18next';

interface Values {
    name: string;
    publicKey: string;
}

const CustomTextarea = styled(Textarea)`
    ${tw`h-32`}
`;

export default () => {
    const { t } = useTranslation('dashboard');
    const { clearAndAddHttpError } = useFlashKey('account');
    const { mutate } = useSSHKeys();

    const submit = (values: Values, { setSubmitting, resetForm }: FormikHelpers<Values>) => {
        clearAndAddHttpError();

        createSSHKey(values.name, values.publicKey)
            .then(key => {
                resetForm();
                mutate(data => (data || []).concat(key));
            })
            .catch(error => clearAndAddHttpError(error))
            .then(() => setSubmitting(false));
    };

    return (
        <>
            <Formik
                onSubmit={submit}
                initialValues={{ name: '', publicKey: '' }}
                validationSchema={object().shape({
                    name: string().required(),
                    publicKey: string().required(),
                })}
            >
                {({ isSubmitting }) => (
                    <Form>
                        <SpinnerOverlay visible={isSubmitting} />
                        <FormikFieldWrapper label={t('account.sshKeyName')} name={'name'} css={tw`mb-6`}>
                            <Field name={'name'} as={Input} />
                        </FormikFieldWrapper>
                        <FormikFieldWrapper
                            label={t('account.publicKey')}
                            name={'publicKey'}
                            description={t('account.publicKeyDescription')}
                        >
                            <Field name={'publicKey'} as={CustomTextarea} />
                        </FormikFieldWrapper>
                        <div css={tw`flex justify-end mt-6`}>
                            <Button>{t('account.save')}</Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </>
    );
};
