import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import SupportSvg from '@/assets/images/themed/SupportSvg';
import { faTicket } from '@fortawesome/free-solid-svg-icons';
import FeatureContainer from '@/elements/FeatureContainer';
import ToggleTicketsButton from '@admin/modules/tickets/ToggleTicketsButton';

export default () => {
    const { t } = useTranslation('admin');
    const primary = useStoreState(state => state.theme.data!.colors.primary);

    return (
        <FeatureContainer image={<SupportSvg color={primary} />} icon={faTicket} title={t('ticketsModule.ticketSystem') as string}>
            {t('ticketsModule.enableDescription') as string}
            <p className={'text-right'}>
                <ToggleTicketsButton />
            </p>
        </FeatureContainer>
    );
};
