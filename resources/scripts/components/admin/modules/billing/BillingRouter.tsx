import { useStoreState } from '@/state/hooks';
import { Route, Routes } from 'react-router-dom';
import { NotFound } from '@/elements/ScreenBlock';
import EnableBilling from '@admin/modules/billing/EnableBilling';
import FlashMessageRender from '@/elements/FlashMessageRender';
import ProductForm from '@admin/modules/billing/products/ProductForm';
import CategoryForm from '@admin/modules/billing/products/CategoryForm';
import { SubNavigation, SubNavigationLink } from '@admin/SubNavigation';
import OverviewContainer from '@/components/admin/modules/billing/overview/OverviewContainer';
import CategoryTable from '@admin/modules/billing/products/CategoryTable';
import OrdersContainer from '@admin/modules/billing/orders/OrdersContainer';
import InvoicesContainer from '@admin/modules/billing/invoices/InvoicesContainer';
import ProductContainer from '@admin/modules/billing/products/ProductContainer';
import CategoryContainer from '@admin/modules/billing/products/CategoryContainer';
import {
    CalendarIcon,
    CogIcon,
    CurrencyDollarIcon,
    DesktopComputerIcon,
    DocumentTextIcon,
    ShoppingCartIcon,
    ViewGridIcon,
    XCircleIcon,
} from '@heroicons/react/outline';
import SettingsContainer from '@admin/modules/billing/SettingsContainer';
import BillingExceptionsContainer from './exceptions/BillingExceptionsContainer';
import RenewalDatesContainer from '@admin/modules/billing/RenewalDatesContainer';
import DiscountCodesContainer from '@/components/admin/modules/billing/discounts/DiscountCodesContainer';
import { useTranslation } from 'react-i18next';

export default () => {
    const enabled = useStoreState(state => state.everest.data!.billing.enabled);
    const { t } = useTranslation('admin');

    if (!enabled) return <EnableBilling />;

    return (
        <>
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('billingModule.billing')}</h2>
                    <p className={'text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'}>
                        {t('billingModule.configureBillingSettings')}
                    </p>
                </div>
            </div>

            <FlashMessageRender byKey={'admin:billing'} className={'mb-4'} />

            <SubNavigation>
                <SubNavigationLink to={'/admin/billing'} name={t('billingModule.overview')} base>
                    <DesktopComputerIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/billing/categories'} name={t('billingModule.products')}>
                    <ViewGridIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/billing/orders'} name={t('billingModule.orders')}>
                    <ShoppingCartIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/billing/invoices'} name={t('billingModule.invoices')}>
                    <DocumentTextIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/billing/exceptions'} name={t('billingModule.exceptions')}>
                    <XCircleIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/billing/renewal-dates'} name={t('billingModule.renewalDates')}>
                    <CalendarIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/billing/discount-codes'} name={t('billingModule.discountCodes')}>
                    <CurrencyDollarIcon />
                </SubNavigationLink>
                <SubNavigationLink to={'/admin/billing/settings'} name={t('billingModule.settings')}>
                    <CogIcon />
                </SubNavigationLink>
            </SubNavigation>
            <Routes>
                <Route path={'/'} element={<OverviewContainer />} />

                <Route path={'/categories'} element={<CategoryTable />} />
                <Route path={'/categories/new'} element={<CategoryForm />} />
                <Route path={'/categories/:id'} element={<CategoryContainer />} />

                <Route path={'/categories/:id/products/new'} element={<ProductForm />} />
                <Route path={'/categories/:id/products/:productId'} element={<ProductContainer />} />

                <Route path={'/orders'} element={<OrdersContainer />} />

                <Route path={'/invoices'} element={<InvoicesContainer />} />

                <Route path={'/exceptions'} element={<BillingExceptionsContainer />} />

                <Route path={'/renewal-dates'} element={<RenewalDatesContainer />} />

                <Route path={'/discount-codes'} element={<DiscountCodesContainer />} />

                <Route path={'/settings'} element={<SettingsContainer />} />

                <Route path={'/*'} element={<NotFound />} />
            </Routes>
        </>
    );
};
