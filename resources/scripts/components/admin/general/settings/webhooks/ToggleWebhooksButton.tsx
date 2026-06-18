import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import { Button } from '@/elements/button';
import { update } from '@/api/routes/admin/webhooks';
import { useNavigate } from 'react-router-dom';

export default () => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const enabled = useStoreState(state => state.everest.data!.webhooks.enabled);

    const submit = () => {
        update('enabled', !enabled).then(() => navigate(0));
    };

    return (
        <div className={'mr-4'} onClick={submit}>
            {!enabled ? <Button>{t('settings.enableWebhooks') as string}</Button> : <Button.Danger>{t('settings.disableWebhooks') as string}</Button.Danger>}
        </div>
    );
};
