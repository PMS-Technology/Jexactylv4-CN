import AdminContentBlock from '@/elements/AdminContentBlock';
import DiscountCodesTable from './DiscountCodesTable';
import DiscountCodeDialog from './DiscountCodeDialog';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    return (
    <AdminContentBlock title={t('billingModule.billingOrders')}>
        <div className={'w-full flex flex-row items-center p-8'}>
            <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('billingModule.discountCodes')}</h2>
                <p
                    className={
                        'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                    }
                >
                    {t('billingModule.availableDiscountCodesDescription')}
                </p>
            </div>
            <div className={'flex ml-auto pl-4 space-x-4'}>
                <DiscountCodeDialog />
            </div>
        </div>
        <FlashMessageRender byKey={'admin:billing:discount-codes'} className={'mb-2'} />
        <DiscountCodesTable />
    </AdminContentBlock>
    );
};
