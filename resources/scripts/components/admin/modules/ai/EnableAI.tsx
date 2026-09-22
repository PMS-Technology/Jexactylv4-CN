import { useStoreState } from '@/state/hooks';
import AISvg from '@/assets/images/themed/AISvg';
import FeatureContainer from '@/elements/FeatureContainer';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import ToggleFeatureButton from '@admin/modules/ai/ToggleFeatureButton';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    const primary = useStoreState(state => state.theme.data!.colors.primary);

    return (
        <FeatureContainer
            image={<AISvg color={primary} />}
            icon={faWandMagicSparkles}
            title={t('aiModule.title') as string}
        >
            {t('aiModule.enableDescription') as string}
            <p className={'text-right mt-2'}>
                <ToggleFeatureButton />
            </p>
        </FeatureContainer>
    );
};
