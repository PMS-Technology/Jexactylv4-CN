import { Fragment } from 'react';
import { Actions, State, useStoreActions, useStoreState } from 'easy-peasy';
import { Form, Formik, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import Field from '@/elements/Field';
import { httpErrorToHuman } from '@/api/http';
import { ApplicationStore } from '@/state';
import tw from 'twin.macro';
import { Button } from '@/elements/button/index';
import { useTranslation } from 'react-i18next';

interface Values {
    email: string;
    password: string;
}

export default () => {
    const { t } = useTranslation('dashboard');
    const user = useStoreState((state: State<ApplicationStore>) => state.user.data);
    const updateEmail = useStoreActions((state: Actions<ApplicationStore>) => state.user.updateUserEmail);

    const { clearFlashes, addFlash } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);
    const schema = Yup.object().shape({
        email: Yup.string().email().required(),
        password: Yup.string().required(t('account.currentAccountPasswordRequired')),
    });

    const submit = (values: Values, { resetForm, setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('account:email');

        updateEmail({ ...values })
            .then(() =>
                addFlash({
                    type: 'success',
                    key: 'account:email',
                    message: t('account.emailUpdated'),
                }),
            )
            .catch(error =>
                addFlash({
                    type: 'error',
                    key: 'account:email',
                    title: t('account.error'),
                    message: httpErrorToHuman(error),
                }),
            )
            .then(() => {
                resetForm();
                setSubmitting(false);
            });
    };

    return (
        <Formik onSubmit={submit} validationSchema={schema} initialValues={{ email: user!.email, password: '' }}>
            {({ isSubmitting, isValid }) => (
                <Fragment>
                    <SpinnerOverlay size={'large'} visible={isSubmitting} />
                    <Form css={tw`m-0`}>
                        <Field id={'current_email'} type={'email'} name={'email'} label={t('account.email')} />
                        <div css={tw`mt-6`}>
                            <Field
                                id={'confirm_password'}
                                type={'password'}
                                name={'password'}
                                label={t('account.confirmPassword')}
                            />
                        </div>
                        <div css={tw`mt-6`}>
                            <Button disabled={isSubmitting || !isValid}>{t('account.updateEmailButton')}</Button>
                        </div>
                    </Form>
                </Fragment>
            )}
        </Formik>
    );
};
