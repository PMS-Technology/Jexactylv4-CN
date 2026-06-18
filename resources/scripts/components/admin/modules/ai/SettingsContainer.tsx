import Field from '@/elements/Field';
import { useTranslation } from 'react-i18next';
import Label from '@/elements/Label';
import { Form, Formik } from 'formik';
import AdminBox from '@/elements/AdminBox';
import { useStoreState } from '@/state/hooks';
import { faKey, faUser } from '@fortawesome/free-solid-svg-icons';
import { AISettings, updateSettings } from '@/api/routes/admin/ai/settings';
import useFlash from '@/plugins/useFlash';
import { Button } from '@/elements/button';

export default () => {
    const { t } = useTranslation('admin');
    const { clearFlashes, clearAndAddHttpError, addFlash } = useFlash();
    const ai = useStoreState(s => s.everest.data!.ai);

    const submit = (values: AISettings) => {
        clearFlashes();

        updateSettings(values)
            .then(() => {
                addFlash({
                    type: 'success',
                    key: 'admin:ai:settings',
                    message: 'Settings have been updated successfully.',
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'admin:ai:settings',
                    error: error,
                });
            });
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={{
                user_access: ai.user_access,
            }}
        >
            <Form>
                <div className={'grid lg:grid-cols-4 gap-4'}>
                    <AdminBox title={t('aiModule.clientSideAI') as string} icon={faUser}>
                        <div>
                            <div className={'inline-flex'}>
                                <Label className={'mt-1 mr-2'}>{t('aiModule.allowStandardUsers') as string}</Label>
                                <Field
                                    id={'user_access'}
                                    name={'user_access'}
                                    type={'checkbox'}
                                    defaultChecked={ai.user_access}
                                />
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>
                                {t('aiModule.allowStandardUsersDescription') as string}
                            </p>
                        </div>
                    </AdminBox>
                    <AdminBox title={t('aiModule.modifyApiKey') as string} icon={faKey}>
                        <div>
                            <Field id={'key'} name={'key'} type={'input'} />
                            <p className={'text-gray-400 text-xs mt-1.5'}>
                                {t('aiModule.modifyApiKeyDescription') as string}
                            </p>
                        </div>
                    </AdminBox>
                </div>
                <div className={'w-full flex flex-row items-center mt-6'}>
                    <div className={'flex text-xs text-gray-500'}>
                        {t('aiModule.changesMayNotApply') as string}
                    </div>
                    <div className={'flex ml-auto'}>
                        <Button type="submit">{t('aiModule.saveChanges') as string}</Button>
                    </div>
                </div>
            </Form>
        </Formik>
    );
};
