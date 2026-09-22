import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/elements/Modal';
import { Form, Formik, FormikHelpers } from 'formik';
import Field from '@/elements/Field';
import { object, string } from 'yup';
import { createDatabase } from '@/api/routes/server/databases';
import { ServerContext } from '@/state/server';
import { httpErrorToHuman } from '@/api/http';
import FlashMessageRender from '@/elements/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/elements/button';
import tw from 'twin.macro';

interface Values {
    databaseName: string;
    connectionsFrom: string;
}

export default () => {
    const { t } = useTranslation('server');
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const { addError, clearFlashes } = useFlash();
    const [visible, setVisible] = useState(false);

    const schema = object().shape({
        databaseName: string()
            .required(t('databasesPage.validation.nameRequired') as string)
            .min(3, t('databasesPage.validation.nameMin') as string)
            .max(48, t('databasesPage.validation.nameMax') as string)
            .matches(/^[\w\-.]{3,48}$/, t('databasesPage.validation.nameFormat') as string),
        connectionsFrom: string().matches(/^[\w\-/.%:]+$/, t('databasesPage.validation.connectionsFrom') as string),
    });

    const appendDatabase = ServerContext.useStoreActions(actions => actions.databases.appendDatabase);

    const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('database:create');
        createDatabase(uuid, {
            databaseName: values.databaseName,
            connectionsFrom: values.connectionsFrom || '%',
        })
            .then(database => {
                appendDatabase(database);
                setVisible(false);
            })
            .catch(error => {
                addError({ key: 'database:create', message: httpErrorToHuman(error) });
                setSubmitting(false);
            });
    };

    return (
        <>
            <Formik
                onSubmit={submit}
                initialValues={{ databaseName: '', connectionsFrom: '' }}
                validationSchema={schema}
            >
                {({ isSubmitting, resetForm }) => (
                    <Modal
                        visible={visible}
                        dismissable={!isSubmitting}
                        showSpinnerOverlay={isSubmitting}
                        onDismissed={() => {
                            resetForm();
                            setVisible(false);
                        }}
                    >
                        <FlashMessageRender byKey={'database:create'} css={tw`mb-6`} />
                        <h2 css={tw`text-2xl mb-6`}>{t('databasesPage.createNew') as string}</h2>
                        <Form css={tw`m-0`}>
                            <Field
                                type={'string'}
                                id={'database_name'}
                                name={'databaseName'}
                                label={t('databasesPage.databaseName') as string}
                                description={t('databasesPage.databaseNameDesc') as string}
                            />
                            <div css={tw`mt-6`}>
                                <Field
                                    type={'string'}
                                    id={'connections_from'}
                                    name={'connectionsFrom'}
                                    label={t('databasesPage.connectionsFrom') as string}
                                    description={t('databasesPage.connectionsFromDesc') as string}
                                />
                            </div>
                            <div css={tw`flex flex-wrap justify-end mt-6`}>
                                <Button
                                    type={'button'}
                                    css={tw`w-full sm:w-auto sm:mr-2`}
                                    onClick={() => setVisible(false)}
                                >
                                    {t('databasesPage.cancel') as string}
                                </Button>
                                <Button css={tw`w-full mt-4 sm:w-auto sm:mt-0`} type={'submit'}>
                                    {t('databasesPage.createDatabase') as string}
                                </Button>
                            </div>
                        </Form>
                    </Modal>
                )}
            </Formik>
            <Button onClick={() => setVisible(true)}>{t('databasesPage.newDatabase') as string}</Button>
        </>
    );
};
