import { Form, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import Field from '@/elements/Field';
import { Button } from '@/elements/button';
import { AlertSettings, updateAlertSettings } from '@/api/routes/admin/alerts';
import { useStoreActions, useStoreState } from '@/state/hooks';
import { faEye, faList, faPaintBrush } from '@fortawesome/free-solid-svg-icons';
import useFlash from '@/plugins/useFlash';
import { useEffect, useState } from 'react';
import FlashMessageRender from '@/elements/FlashMessageRender';
import Label from '@/elements/Label';
import Select from '@/elements/Select';
import { AlertType } from '@/state/everest';

export default () => {
    const { t } = useTranslation('admin');
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    const { alert } = useStoreState(state => state.everest.data!);
    const [type, setType] = useState<AlertType>(alert.type);
    const updateEverest = useStoreActions(actions => actions.everest.updateEverest);

    const submit = (values: AlertSettings) => {
        clearFlashes();

        values.type = type;

        updateAlertSettings(values)
            .then(uuid => {
                updateEverest({ alert: { ...values, uuid } });

                addFlash({
                    type: 'success',
                    key: 'settings:alert',
                    message: 'Settings have been updated successfully.',
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'settings:alert',
                    error: error,
                });
            });
    };

    useEffect(() => {
        clearFlashes();
    }, []);

    return (
        <Formik
            onSubmit={submit}
            initialValues={{
                enabled: alert.enabled,
                type: alert.type,
                position: alert.position,
                content: alert.content,
            }}
        >
            <Form>
                <FlashMessageRender byKey={'settings:alert'} className={'mb-2'} />
                <div css={tw`grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-6`}>
                    <AdminBox title={t('alertModule.alertStatus') as string} icon={faEye}>
                        <div>
                            <div className={'inline-flex'}>
                                <Label className={'mt-1 mr-2'}>{t('alertModule.showAlertToUsers') as string}</Label>
                                <Field
                                    id={'enabled'}
                                    name={'enabled'}
                                    type={'checkbox'}
                                    defaultChecked={alert.enabled}
                                />
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>
                                {t('alertModule.alertStatusDescription') as string}
                            </p>
                        </div>
                    </AdminBox>
                    <AdminBox title={t('alertModule.alertType') as string} icon={faList}>
                        <div>
                            <div>
                                <Select
                                    onChange={e => setType(e.currentTarget.value as AlertType)}
                                    defaultValue={alert.type}
                                >
                                    <option value={'success'}>{t('alertModule.successGreen') as string}</option>
                                    <option value={'info'}>{t('alertModule.infoBlue') as string}</option>
                                    <option value={'warning'}>{t('alertModule.warningYellow') as string}</option>
                                    <option value={'danger'}>{t('alertModule.dangerRed') as string}</option>
                                </Select>
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>
                                {t('alertModule.alertTypeDescription') as string}
                            </p>
                        </div>
                    </AdminBox>
                    <AdminBox title={t('alertModule.alertContent') as string} icon={faPaintBrush} className={'md:col-span-2'}>
                        <Field id={'content'} name={'content'} type={'text'} description={''} />
                        <p className={'text-gray-400 text-xs mt-1.5'}>
                            {t('alertModule.alertContentDescription') as string}
                        </p>
                        <p className={'text-gray-400 text-xs mt-1'}>
                            {t('alertModule.currentUuid') as string} <span className={'text-gray-600'}>{alert.uuid}</span>
                        </p>
                    </AdminBox>
                </div>
                <div css={tw`w-full flex flex-row items-center mt-6`}>
                    <div css={tw`flex ml-auto`}>
                        <Button type="submit">{t('alertModule.saveChanges') as string}</Button>
                    </div>
                </div>
            </Form>
        </Formik>
    );
};
