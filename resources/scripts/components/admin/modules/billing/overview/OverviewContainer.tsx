import Stepper from '@/elements/Stepper';
import { faArrowRight, faCheck, faEllipsis } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState } from 'react';
import Spinner from '@/elements/Spinner';
import { useStoreState } from '@/state/hooks';
import ContentBox from '@/elements/ContentBox';
import { differenceInDays, parseISO } from 'date-fns';
import SuccessChart from './SuccessChart';
import RevenueChart from './RevenueChart';
import Select from '@/elements/Select';
import SetupStripe from '@admin/modules/billing/guides/SetupStripe';
import { getBillingAnalytics } from '@/api/routes/admin/billing';
import { BillingAnalytics, Order } from '@definitions/admin';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    const now = new Date();
    const [history, setHistory] = useState<number>(14);
    const settings = useStoreState(s => s.everest.data!.billing);
    const [analytics, setAnalytics] = useState<BillingAnalytics>();

    useEffect(() => {
        getBillingAnalytics()
            .then(data => setAnalytics(data))
            .catch(error => console.error(error));
    }, []);

    if (!analytics || !analytics.orders) return <Spinner size={'large'} centered />;

    const hasProducts = analytics.products?.length ?? 0 >= 1;
    const hasOrders = analytics.orders?.length ?? 0 >= 1;

    const successfulOrders: Order[] = analytics.orders.filter(
        x => x.status === 'processed' && differenceInDays(now, parseISO(x.created_at.toString())) <= history,
    );
    const allOrders: Order[] = analytics.orders.filter(
        x => differenceInDays(now, parseISO(x.created_at.toString())) <= history,
    );
    const successRate: string = ((successfulOrders.length / allOrders.length) * 100).toFixed(1);

    const revenue: string = successfulOrders.reduce((total, order) => total + order.total, 0).toFixed(2);

    return (
        <div className={'grid lg:grid-cols-5 gap-4'}>
            <SetupStripe />
            <ol className="space-y-4 w-full">
                <Select onChange={e => setHistory(Number(e.currentTarget.value))}>
                    <option value={7}>{t('billingModule.last7Days')}</option>
                    <option selected value={14}>
                        {t('billingModule.last14Days')}
                    </option>
                    <option value={30}>{t('billingModule.lastMonth')}</option>
                    <option value={60}>{t('billingModule.last2Months')}</option>
                    <option value={90}>{t('billingModule.last3Months')}</option>
                    <option value={180}>{t('billingModule.last6Months')}</option>
                    <option value={360}>{t('billingModule.lastYear')}</option>
                </Select>
                <h2 className={'text-neutral-300 mb-4 px-4 text-2xl'}>{t('billingModule.suggestedActions')}</h2>
                <Stepper className={'text-green-500'} icon={faCheck} content={t('billingModule.enableBillingModule')} />
                <Stepper
                    className={hasProducts ? 'text-green-500' : 'text-blue-500'}
                    icon={hasProducts ? faCheck : faArrowRight}
                    content={t('billingModule.addYourFirstProduct')}
                    link={'/admin/billing/categories'}
                />
                <Stepper
                    className={hasOrders ? 'text-green-500' : hasProducts ? 'text-blue-500' : 'text-gray-500'}
                    icon={hasOrders ? faCheck : faEllipsis}
                    content={t('billingModule.secureYourFirstSale')}
                    link={'/admin/billing/orders'}
                />
            </ol>
            <div className={'flex flex-col items-center rounded-lg shadow md:flex-row col-span-4'}>
                <div className={'w-full grid grid-cols-3 mb-auto gap-6'}>
                    <ContentBox>
                        <h1 className={'text-2xl font-bold'}>
                            <span className={'text-4xl'}>{successRate}</span>% {t('billingModule.conversionRate')}
                        </h1>
                        <p className={'text-gray-400 text-sm mt-2'}>
                            {t('billingModule.outOfOrdersProcessed', { total: allOrders.length, successful: successfulOrders.length })}
                        </p>
                        <SuccessChart data={analytics} history={history} />
                    </ContentBox>
                    <ContentBox className={'col-span-2'}>
                        <h1 className={'text-2xl font-bold'}>
                            {settings.currency.symbol}
                            <span className={'text-4xl'}>{revenue}</span> {t('billingModule.totalRevenue')}
                        </h1>
                        <p className={'text-gray-400 text-sm mt-2'}>
                            {t('billingModule.successfulOrdersGenerated', { count: successfulOrders.length, symbol: settings.currency.symbol, revenue, code: settings.currency.code, days: history })}
                        </p>
                        <RevenueChart data={analytics} history={history} />
                    </ContentBox>
                </div>
            </div>
        </div>
    );
};
