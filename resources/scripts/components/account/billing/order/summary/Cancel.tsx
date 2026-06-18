import { useStoreState } from '@/state/hooks';
import CancelSvg from '@/assets/images/themed/CancelSvg';
import PageContentBlock from '@/elements/PageContentBlock';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('dashboard');
    const { colors } = useStoreState(s => s.theme.data!);

    return (
        <PageContentBlock>
            <div className={'flex justify-center'}>
                <div
                    className={'w-full sm:w-3/4 md:w-1/2 p-12 md:p-20 rounded-lg shadow-lg text-center relative'}
                    style={{ backgroundColor: colors.secondary }}
                >
                    <CancelSvg color={colors.primary} />
                    <h2 className={'mt-10 text-white font-bold text-4xl'}>{t('billing.orderCancelled')}</h2>
                    <p className={'text-sm text-neutral-400 mt-2'}>{t('billing.orderCancelledDescription')}</p>
                </div>
            </div>
        </PageContentBlock>
    );
};
