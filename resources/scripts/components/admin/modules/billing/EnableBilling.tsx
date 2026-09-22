import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import FeatureContainer from '@/elements/FeatureContainer';
import BillingSvg from '@/assets/images/themed/BillingSvg';
import { faMoneyBillWave } from '@fortawesome/free-solid-svg-icons';
import ToggleFeatureButton from '@admin/modules/billing/ToggleFeatureButton';

export default () => {
    const { t } = useTranslation('admin');
    const primary = useStoreState(state => state.theme.data!.colors.primary);

    return (
        <FeatureContainer
            image={<BillingSvg color={primary} />}
            icon={faMoneyBillWave}
            title={t('billingModule.billingSystem') as string}
        >
            {t('billingModule.enableDescription') as string}
            <p className={'text-right mt-2'}>
                <ToggleFeatureButton />
            </p>
        </FeatureContainer>
    );
};
