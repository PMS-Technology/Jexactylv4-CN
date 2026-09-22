import AdminContentBlock from '@/elements/AdminContentBlock';
import InvoicesTable from './InvoicesTable';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');

    return (
        <AdminContentBlock title={t('billingModule.billingInvoices')}>
            <div className={'w-full flex flex-row items-center p-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>
                        {t('billingModule.invoices')}
                    </h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('billingModule.generatedInvoicesDescription')}
                    </p>
                </div>
            </div>
            <InvoicesTable />
        </AdminContentBlock>
    );
};
