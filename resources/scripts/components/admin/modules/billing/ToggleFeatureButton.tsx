import { Button } from '@/elements/button';
import { useTranslation } from 'react-i18next';
import { useStoreState } from '@/state/hooks';
import { updateSettings } from '@/api/routes/admin/billing';

export default () => {
    const { t } = useTranslation('admin');
    const enabled = useStoreState(state => state.everest.data!.billing.enabled);

    const submit = () => {
        updateSettings('enabled', !enabled).then(() => {
            // @ts-expect-error this is fine
            window.location = '/admin/billing';
        });
    };

    return (
        <div className={'mr-4'} onClick={submit}>
            {!enabled ? <Button>{t('billingModule.enableBillingModule')}</Button> : <Button.Danger>{t('billingModule.disableBillingModule')}</Button.Danger>}
        </div>
    );
};
