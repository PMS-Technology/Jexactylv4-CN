import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import { faExternalLink } from '@fortawesome/free-solid-svg-icons';
import FeatureContainer from '@/elements/FeatureContainer';
import ToggleWebhooksButton from './ToggleWebhooksButton';
import WebhookSvg from '@/assets/images/themed/WebhookSvg';

export default () => {
    const { t } = useTranslation('admin');
    const primary = useStoreState(state => state.theme.data!.colors.primary);

    return (
        <FeatureContainer image={<WebhookSvg color={primary} />} icon={faExternalLink} title={t('settings.webhooks') as string}>
            {t('settings.webhooksDescription') as string}
            <p className={'text-right'}>
                <ToggleWebhooksButton />
            </p>
        </FeatureContainer>
    );
};
