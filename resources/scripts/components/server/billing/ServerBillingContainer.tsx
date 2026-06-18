import { useEffect, useState } from 'react';
import Label from '@/elements/Label';
import { Link, useNavigate } from 'react-router-dom';
import ContentBox from '@/elements/ContentBox';
import { ServerContext } from '@/state/server';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import useFlash from '@/plugins/useFlash';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import { Alert } from '@/elements/alert';
import { useStoreState } from '@/state/hooks';
import PageContentBlock from '@/elements/PageContentBlock';
import { getProduct } from '@/api/routes/account/billing/products';
import { Product } from '@definitions/account/billing';
import { Button } from '@/elements/button';
import FlashMessageRender from '@/elements/FlashMessageRender';
import ServerPaymentButton from './ServerPaymentButton';
import OrdersContainer from '@/components/account/billing/orders/OrdersContainer';
import { processFreeCheckoutSession } from '@/api/routes/account/billing/orders/process';
import { useTranslation } from 'react-i18next';

export function timeUntil(targetDate: Date | string) {
    const date = targetDate instanceof Date ? targetDate : new Date(targetDate);

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    return {
        days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diffMs / (1000 * 60 * 60)) % 24),
    };
}

export default () => {
    const { t } = useTranslation('server');
    const [product, setProduct] = useState<Product>();
    const [loading, setLoading] = useState<boolean>(true);
    const [renewing, setRenewing] = useState<boolean>(false);

    const navigate = useNavigate();
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const settings = useStoreState(s => s.everest.data!.billing);
    const serverUuid = ServerContext.useStoreState(s => s.server.data!.uuid);
    const serverId = ServerContext.useStoreState(s => s.server.data!.internalId);
    const billingProductId = ServerContext.useStoreState(s => s.server.data!.billingProductId);
    const renewalDate = ServerContext.useStoreState(s => s.server.data!.renewalDate);

    useEffect(() => {
        clearFlashes();

        if (billingProductId) {
            getProduct(billingProductId)
                .then(data => setProduct(data))
                .then(() => setLoading(false))
                .catch(error => {
                    setLoading(false);
                    console.error(error);
                });
        }
    }, []);

    const handleFreeRenewal = () => {
        if (!product || !billingProductId) return;

        setRenewing(true);
        clearFlashes('server:billing');

        processFreeCheckoutSession(billingProductId, undefined, undefined, Number(serverId))
            .then(() => {
                navigate(`/server/${serverUuid}`);
            })
            .catch(error => {
                clearAndAddHttpError({ key: 'server:billing', error });
                setRenewing(false);
            });
    };

    const daysRemaining = renewalDate ? timeUntil(renewalDate).days : 0;

    return (
        <PageContentBlock
            title={t('billingPage.title')}
            header
            description={t('billingPage.description')}
        >
            {!product && !loading && (
                <Alert type={'warning'} className={'mb-6'}>
                    {t('billingPage.productMissingWarning')}
                </Alert>
            )}
            <div className={'grid lg:grid-cols-3 gap-4'}>
                {!renewalDate ? (
                    <Alert type={'warning'}>{t('billingPage.noRenewalDate')}</Alert>
                ) : (
                    <ContentBox title={t('billingPage.summary')}>
                        <SpinnerOverlay visible={loading} />
                        <div>
                            <Label>{t('billingPage.nextRenewalDue')}</Label>
                            <p className={'text-gray-400 text-sm'}>
                                {new Date(renewalDate).toLocaleDateString()}
                                {' - '}
                                {t('billingPage.timeRemaining', {
                                    days: timeUntil(renewalDate).days,
                                    hours: timeUntil(renewalDate).hours,
                                })}
                            </p>
                        </div>
                        <div className={'my-6'}>
                            <Label>{t('billingPage.yourPackage')}</Label>
                            <p className={'text-gray-400 text-sm'}>{product ? product.name : t('billingPage.unknown')}</p>
                            <p className={'text-gray-500 text-xs'}>{product && product.description}</p>
                        </div>
                        <div>
                            <Label>{t('billingPage.planCost')}</Label>
                            <div className={'flex justify-between'}>
                                <p className={'text-gray-400 text-sm'}>
                                    {settings.currency.symbol}
                                    {t('billingPage.everyDays', {
                                        price: product ? product.price : '...',
                                        currency: settings.currency.code.toUpperCase(),
                                        days: settings.renewal.days,
                                    })}
                                </p>
                                <Link to={'/account/billing/orders'} className={'text-green-400 text-xs'}>
                                    {t('billingPage.viewOrder')} <FontAwesomeIcon icon={faArrowRight} />
                                </Link>
                            </div>
                        </div>
                    </ContentBox>
                )}
                <div className={'lg:col-span-2'}>
                    <h2 className={'text-neutral-300 mb-4 px-4 text-2xl'}>{t('billingPage.relatedOrders')}</h2>
                    <OrdersContainer server_id={Number(serverId)} />
                </div>
                <ContentBox title={t('billingPage.renewServer')} className={'mt-6'}>
                    <FlashMessageRender byKey={'server:billing'} className={'mb-4'} />
                    {!product ? (
                        <Alert type={'danger'}>
                            {t('billingPage.productMissingRenewal')}
                        </Alert>
                    ) : (
                        <>
                            {product.price === 0 ? (
                                <div>
                                    <p className={'mb-4'}>
                                        {t('billingPage.freeRenewalWarning', { days: daysRemaining })}
                                    </p>
                                    {!(daysRemaining - 7 <= 0) && (
                                        <p className={'mb-4 text-sm text-gray-400'}>
                                            {t('billingPage.renewalAvailableSoon', { days: daysRemaining - 7 })}
                                        </p>
                                    )}
                                    {daysRemaining - 7 <= 0 && (
                                        <Button
                                            onClick={handleFreeRenewal}
                                            disabled={renewing}
                                            size={Button.Sizes.Large}
                                        >
                                            {renewing ? t('billingPage.renewing') : t('billingPage.renewServer')}
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <ServerPaymentButton product={product} />
                            )}
                        </>
                    )}
                </ContentBox>
                {settings.allow_upgrades && (
                    <ContentBox className={'mt-6 lg:col-span-2'} title={t('billingPage.upgradeServerPackage')}>
                        {t('billingPage.upgradeDescription')}
                        <div className={'text-right'}>
                            <Link to={`/server/${serverUuid.slice(0, 8)}/billing/upgrade`}>
                                <Button className={'mt-8'} size={Button.Sizes.Large}>
                                    {t('billingPage.viewOptions')} <FontAwesomeIcon icon={faArrowRight} className={'ml-2'} />
                                </Button>
                            </Link>
                        </div>
                    </ContentBox>
                )}
            </div>
        </PageContentBlock>
    );
};
