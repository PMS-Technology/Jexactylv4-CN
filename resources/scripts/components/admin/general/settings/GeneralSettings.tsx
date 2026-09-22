import { Form, Formik } from 'formik';
import tw from 'twin.macro';

import AdminBox from '@/elements/AdminBox';
import Field from '@/elements/Field';
import { Button } from '@/elements/button';
import { GeneralSettings, updateGeneralSettings } from '@/api/routes/admin/settings';
import { useStoreActions, useStoreState } from '@/state/hooks';
import { faPaintBrush, faPlusCircle, faRecycle, faShapes, faImage, faEye } from '@fortawesome/free-solid-svg-icons';
import useFlash from '@/plugins/useFlash';
import { useEffect } from 'react';
import FlashMessageRender from '@/elements/FlashMessageRender';
import Label from '@/elements/Label';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    const settings = useStoreState(state => state.settings.data!);
    const updateSettings = useStoreActions(actions => actions.settings.updateSettings);

    const submit = (values: GeneralSettings) => {
        clearFlashes();

        updateGeneralSettings(values)
            .then(() => {
                updateSettings(values);

                addFlash({
                    type: 'success',
                    key: 'settings:general',
                    message: t('settings.savedSuccessfully'),
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'settings:general',
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
                name: settings.name,
                logo: settings.logo,
                indicators: settings.indicators,
                auto_update: settings.auto_update,
                speed_dial: settings.speed_dial,
                activity: {
                    enabled: {
                        account: settings.activity.enabled.account,
                        server: settings.activity.enabled.server,
                        admin: settings.activity.enabled.admin,
                    },
                },
            }}
        >
            <Form>
                <FlashMessageRender byKey={'settings:general'} className={'mb-2'} />
                <div css={tw`grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6`}>
                    <AdminBox title={t('settings.companyName') as string} icon={faPaintBrush}>
                        <Field id={'name'} name={'name'} type={'text'} description={''} />
                        <p className={'text-gray-400 text-xs mt-1.5'}>{t('settings.companyNameDesc')}</p>
                    </AdminBox>
                    <AdminBox title={t('settings.logo') as string} icon={faImage}>
                        <Field id={'logo'} name={'logo'} type={'url'} description={''} />
                        <p className={'text-gray-400 text-xs mt-1.5'}>{t('settings.logoDesc')}</p>
                    </AdminBox>
                    <AdminBox title={t('settings.autoUpdate') as string} icon={faRecycle}>
                        <div>
                            <div className={'inline-flex'}>
                                <Label className={'mt-1 mr-2'}>{t('settings.allowAutoUpdate')}</Label>
                                <Field
                                    id={'auto_update'}
                                    name={'auto_update'}
                                    type={'checkbox'}
                                    defaultChecked={settings.auto_update}
                                />
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>{t('settings.autoUpdateDesc')}</p>
                        </div>
                    </AdminBox>
                    <AdminBox title={t('settings.adminIndicators') as string} icon={faShapes}>
                        <div>
                            <div className={'inline-flex'}>
                                <Label className={'mt-1 mr-2'}>{t('settings.showIndicators')}</Label>
                                <Field
                                    id={'indicators'}
                                    name={'indicators'}
                                    type={'checkbox'}
                                    defaultChecked={settings.indicators}
                                />
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>{t('settings.indicatorsDesc')}</p>
                        </div>
                    </AdminBox>
                    <AdminBox title={t('settings.speedDial') as string} icon={faPlusCircle}>
                        <div>
                            <div className={'inline-flex'}>
                                <Label className={'mt-1 mr-2'}>{t('settings.showSpeedDial')}</Label>
                                <Field
                                    id={'speed_dial'}
                                    name={'speed_dial'}
                                    type={'checkbox'}
                                    defaultChecked={settings.speed_dial}
                                />
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>{t('settings.speedDialDesc')}</p>
                        </div>
                    </AdminBox>
                    <AdminBox title={t('settings.activityLogging') as string} icon={faEye}>
                        <div>
                            <div className={'bg-black/50 rounded-lg p-2 grid lg:grid-cols-3 gap-4 place-items-center'}>
                                <div className={'inline-flex'}>
                                    <Label className={'mt-1 mr-2'}>{t('settings.account')}</Label>
                                    <Field
                                        id={'activity.enabled.account'}
                                        name={'activity.enabled.account'}
                                        type={'checkbox'}
                                        defaultChecked={settings.activity.enabled.account}
                                    />
                                </div>
                                <div className={'inline-flex'}>
                                    <Label className={'mt-1 mr-2'}>{t('settings.server')}</Label>
                                    <Field
                                        id={'activity.enabled.server'}
                                        name={'activity.enabled.server'}
                                        type={'checkbox'}
                                        defaultChecked={settings.activity.enabled.server}
                                    />
                                </div>
                                <div className={'inline-flex'}>
                                    <Label className={'mt-1 mr-2'}>{t('settings.admin')}</Label>
                                    <Field
                                        id={'activity.enabled.admin'}
                                        name={'activity.enabled.admin'}
                                        type={'checkbox'}
                                        defaultChecked={settings.activity.enabled.admin}
                                    />
                                </div>
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>{t('settings.activityLoggingDesc')}</p>
                        </div>
                    </AdminBox>
                </div>
                <div css={tw`w-full flex flex-row items-center mt-6`}>
                    <div css={tw`flex text-xs text-gray-500`}>{t('settings.changesNote')}</div>

                    <div css={tw`flex ml-auto`}>
                        <Button type="submit">{t('settings.saveChanges')}</Button>
                    </div>
                </div>
            </Form>
        </Formik>
    );
};
