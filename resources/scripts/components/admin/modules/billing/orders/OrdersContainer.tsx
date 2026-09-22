import AdminContentBlock from '@/elements/AdminContentBlock';
import OrdersTable from './OrdersTable';
import TitledGreyBox from '@/elements/TitledGreyBox';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');

    return (
        <AdminContentBlock title={t('billingModule.billingOrders')}>
            <div className={'w-full flex flex-row items-center p-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('billingModule.orders')}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('billingModule.listOfOrdersPlacedOnPanel')}
                    </p>
                </div>
            </div>
            <TitledGreyBox
                icon={faExclamationTriangle}
                title={t('billingModule.importantInformation')}
                className={'mb-8'}
            >
                {t('billingModule.pendingOrdersAutoExpiredDescription')}
            </TitledGreyBox>
            <OrdersTable />
        </AdminContentBlock>
    );
};
