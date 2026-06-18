import { Product } from '@/api/definitions/account/billing';
import { getUpgradeCharge, getUpgradeOptions, processUpgrade } from '@/api/routes/server/billing';
import { Alert } from '@/elements/alert';
import { Button } from '@/elements/button';
import ContentBox from '@/elements/ContentBox';
import { Dialog } from '@/elements/dialog';
import FlashMessageRender from '@/elements/FlashMessageRender';
import PageContentBlock from '@/elements/PageContentBlock';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from '@/state/hooks';
import { ServerContext } from '@/state/server';
import {
    faShoppingBag,
    faMicrochip,
    faMemory,
    faHdd,
    faArchive,
    faDatabase,
    faEthernet,
    IconDefinition,
    faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LimitProps {
    icon: IconDefinition;
    limit: ReactElement;
}

const LimitBox = ({ icon, limit }: LimitProps) => (
    <div className={'text-gray-400 mt-1'}>
        <FontAwesomeIcon icon={icon} className={'w-4 h-4 mr-2'} />
        {limit}
    </div>
);

export default () => {
    const { t } = useTranslation('server');
    const settings = useStoreState(state => state.everest.data!.billing);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { colors } = useStoreState(state => state.theme.data!);
    const server = ServerContext.useStoreState(state => state.server.data!);

    const [open, setOpen] = useState<Product | null>();
    const [options, setOptions] = useState<Product[]>();
    const [charge, setCharge] = useState<number | null>();

    useEffect(() => {
        clearFlashes();

        getUpgradeOptions(server.id)
            .then(setOptions)
            .then(() => console.log(options))
            .catch(error => clearAndAddHttpError({ key: 'server:billing:upgrade', error }));
    }, []);

    useEffect(() => {
        if (open) {
            getUpgradeCharge(server.id, open.id)
                .then(data => setCharge(data))
                .catch(error => clearAndAddHttpError({ key: 'server:billing:upgrade', error }));
        }
    }, [open]);

    const submit = () => {
        if (open) {
            processUpgrade(server.id, open.id)
                .then(url => window.location.assign(url))
                .catch(error => clearAndAddHttpError({ key: 'server:billing:upgrade', error }));
        }
    };

    return (
        <PageContentBlock
            title={t('billingPage.upgradeOptions')}
            header
            description={t('billingPage.upgradeOptionsDescription')}
        >
            {open && (
                <Dialog
                    open
                    onClose={() => setOpen(null)}
                    title={t('billingPage.confirmUpgradeTitle', {
                        name: open.name,
                        price: `${settings.currency.symbol}${open.price}`,
                    })}
                >
                    {t('billingPage.confirmUpgradeDescription')}
                    <div className={'my-3 w-full'}>
                        <code className={'px-2 py-1 w-full bg-black/50 rounded-lg'}>
                            {charge !== null ? (
                                <>
                                    {settings.currency.symbol}
                                    {charge?.toFixed(2)} {settings.currency.code.toUpperCase()}
                                </>
                            ) : (
                                <FontAwesomeIcon icon={faSpinner} className={'animate-spin'} />
                            )}
                        </code>
                        <span className={'ml-2 italic text-gray-400'}>{t('billingPage.oneTimeCharge')}</span>
                    </div>
                    {t('billingPage.newRenewalCost', {
                        date: new Date(server.renewalDate!).toLocaleDateString(),
                        price: `${settings.currency.symbol}${open.price}`,
                    })}
                    <div className={'mt-4 text-right'}>
                        <Button onClick={submit} disabled={!charge}>
                            {t('billingPage.upgradeNow')}
                        </Button>
                    </div>
                </Dialog>
            )}
            <FlashMessageRender byKey={'server:billing:upgrade'} />
            <div className={'grid grid-cols-1 xl:grid-cols-3 gap-4'}>
                {!options ||
                    (options.length === 0 && (
                        <Alert type={'info'} className={'xl:col-span-3'}>
                            {t('billingPage.noUpgradePackages')}
                        </Alert>
                    ))}
                {options?.map(product => (
                    <ContentBox key={product.id}>
                        <div className={'p-3 lg:p-6'}>
                            <div className={'flex justify-center'}>
                                {product.icon ? (
                                    <img src={product.icon} className={'w-16 h-16'} />
                                ) : (
                                    <FontAwesomeIcon
                                        icon={faShoppingBag}
                                        className={'w-12 h-12 m-2'}
                                        style={{ color: colors.primary }}
                                    />
                                )}
                            </div>
                            <p className={'text-3xl font-bold text-center mt-3'}>{product.name}</p>
                            <p className={'text-lg font-semibold text-center mt-1 mb-4 text-gray-400'}>
                                <span style={{ color: colors.primary }} className={'mr-1'}>
                                    {settings.currency.symbol}
                                    {product.price.toFixed(2)}
                                    &nbsp;
                                    {settings.currency.code.toUpperCase()}
                                </span>
                                <span className={'text-base'}>{t('billingPage.monthly')}</span>
                            </p>
                            <div className={'grid justify-center items-center'}>
                                <LimitBox icon={faMicrochip} limit={<>{product.limits.cpu}% CPU</>} />
                                <LimitBox
                                    icon={faMemory}
                                    limit={<>{t('billingPage.ram', { amount: product.limits.memory / 1024 })}</>}
                                />
                                <LimitBox
                                    icon={faHdd}
                                    limit={<>{t('billingPage.storage', { amount: product.limits.disk / 1024 })}</>}
                                />
                                <div className={'border border-dashed border-gray-500 my-4'} />
                                {product.limits.backup ? (
                                    <LimitBox
                                        icon={faArchive}
                                        limit={<>{t('billingPage.backupSlots', { count: product.limits.backup })}</>}
                                    />
                                ) : (
                                    <></>
                                )}
                                {product.limits.database ? (
                                    <LimitBox
                                        icon={faDatabase}
                                        limit={<>{t('billingPage.databaseSlots', { count: product.limits.database })}</>}
                                    />
                                ) : (
                                    <></>
                                )}
                                <LimitBox
                                    icon={faEthernet}
                                    limit={
                                        <>
                                            {t('billingPage.networkPorts', { count: product.limits.allocation })}
                                        </>
                                    }
                                />
                            </div>
                            <div className={'text-center mt-6'} onClick={() => setOpen(product)}>
                                <Button size={Button.Sizes.Large} className={'w-full'}>
                                    {t('billingPage.configure')}
                                </Button>
                            </div>
                        </div>
                    </ContentBox>
                ))}
            </div>
        </PageContentBlock>
    );
};
