import { Button } from '@/elements/button';
import { useTranslation } from 'react-i18next';
import { useStoreState } from '@/state/hooks';
import { updateSettings } from '@/api/routes/admin/ai/settings';

export default () => {
    const { t } = useTranslation('admin');
    const ai = useStoreState(state => state.everest.data!.ai);

    const submit = () => {
        updateSettings({ ...ai, enabled: !ai.enabled }).then(() => {
            // @ts-expect-error this is fine
            window.location = '/admin/ai';
        });
    };

    return (
        <div className={'mr-4'} onClick={submit}>
            {!ai.enabled ? <Button>{t('aiModule.enableJexactylAI') as string}</Button> : <Button.Danger>{t('aiModule.disableJexactylAI') as string}</Button.Danger>}
        </div>
    );
};
