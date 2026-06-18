import { Form, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import Field from '@/elements/Field';
import { Button } from '@/elements/button';
import { useStoreState } from '@/state/hooks';
import useFlash from '@/plugins/useFlash';
import { useEffect } from 'react';
import FlashMessageRender from '@/elements/FlashMessageRender';
import Label from '@/elements/Label';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import ToggleWebhooksButton from './ToggleWebhooksButton';
import { update } from '@/api/routes/admin/webhooks';

export interface WebhookSettings {
    url: string;
}

export default () => {
    const { t } = useTranslation('admin');
    const { addFlash, clearFlashes, clearAndAddHttpError } = useFlash();

    const settings = useStoreState(state => state.everest.data!.webhooks);

    const submit = (values: WebhookSettings) => {
        clearFlashes();

        update('url', values.url)
            .then(() => {
                addFlash({
                    type: 'success',
                    key: 'admin:webhooks',
                    message: t('settings.savedSuccessfully') as string,
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'admin:webhooks',
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
                url: '',
            }}
        >
            <Form>
                <FlashMessageRender byKey={'admin:webhooks'} className={'mb-2'} />
                <div>
                    <AdminBox title={t('settings.webhookURL') as string} icon={faLink}>
                        <div>
                            <div>
                                <Label className={'mt-1 mr-2'}>{t('settings.webhookURLConfig') as string}</Label>
                                <Field
                                    id={'url'}
                                    name={'url'}
                                    placeholder={
                                        settings.url
                                            ? (t('settings.webhookURLProvided') as string)
                                            : (t('settings.webhookURLPlaceholder') as string)
                                    }
                                />
                            </div>
                            <p className={'text-gray-400 text-xs mt-1.5'}>
                                {t('settings.webhookURLDesc') as string}
                            </p>
                        </div>
                    </AdminBox>
                </div>
                <div css={tw`w-full flex flex-row items-center mt-6`}>
                    <div css={tw`flex text-xs text-gray-500`}>{t('settings.changesApplyImmediately') as string}</div>

                    <div css={tw`flex ml-auto`}>
                        <ToggleWebhooksButton />
                        <Button type="submit">{t('settings.saveChanges') as string}</Button>
                    </div>
                </div>
            </Form>
        </Formik>
    );
};
