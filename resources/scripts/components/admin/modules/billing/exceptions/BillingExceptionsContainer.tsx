import AdminContentBlock from '@/elements/AdminContentBlock';
import { resolveAllBillingExceptions } from '@/api/routes/admin/billing/exceptions';
import BillingExceptionsTable from './BillingExceptionsTable';
import { Button } from '@/elements/button';
import { CheckCircleIcon } from '@heroicons/react/outline';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    const onResolveAll = () => {
        resolveAllBillingExceptions().then(() => window.location.reload());
    };

    return (
        <AdminContentBlock title={t('billingModule.billingExceptions')}>
            <div className={'w-full flex flex-row items-center p-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('billingModule.exceptions')}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('billingModule.viewAndResolveErrorsDescription')}
                    </p>
                </div>
                <div className={'ml-auto pl-4'}>
                    <Button onClick={onResolveAll}>
                        <CheckCircleIcon className={'inline-flex w-5 h-5 mr-1 mt-0.5'} /> {t('billingModule.resolveAll')}
                    </Button>
                </div>
            </div>
            <BillingExceptionsTable />
        </AdminContentBlock>
    );
};
