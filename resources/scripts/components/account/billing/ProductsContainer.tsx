import classNames from 'classnames';
import Spinner from '@/elements/Spinner';
import { Button } from '@/elements/button';
import { useStoreState } from '@/state/hooks';
import ContentBox from '@/elements/ContentBox';
import { ReactElement, useEffect, useState } from 'react';
import PageContentBlock from '@/elements/PageContentBlock';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    IconDefinition,
    faArchive,
    faDatabase,
    faEthernet,
    faExclamationTriangle,
    faHdd,
    faMemory,
    faMicrochip,
    faShoppingBag,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { Alert } from '@/elements/alert';
import { getProducts } from '@/api/routes/account/billing/products';
import { getCategories } from '@/api/routes/account/billing/categories';
import { Category, Product } from '@definitions/account/billing';
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
    const { t } = useTranslation('dashboard');
    const [category, setCategory] = useState<number>();
    const [products, setProducts] = useState<Product[] | undefined>();
    const [categories, setCategories] = useState<Category[] | undefined>();

    const settings = useStoreState(s => s.everest.data!.billing);
    const { colors } = useStoreState(state => state.theme.data!);

    useEffect(() => {
        (async function () {
            await getCategories().then(data => {
                setCategories(data);
                setCategory(Number(data[0]!.id));
            });
        })();
    }, []);

    useEffect(() => {
        if (products || !category) return;

        getProducts(category).then(data => {
            setProducts(data);
        });
    }, [category]);

    if (!settings.keys.secret) {
        return (
            <Alert type={'danger'}>
                {t('billing.storeUnavailable')}
            </Alert>
        );
    }

    return (
        <PageContentBlock title={t('billing.availableProducts')}>
            <div className={'text-3xl lg:text-5xl font-bold mt-8 mb-12'}>
                {t('billing.orderProduct')}
                <p className={'text-gray-400 font-normal text-sm mt-1'}>{t('billing.orderProductDescription')}</p>
            </div>
            <div className={'grid lg:grid-cols-4 gap-4 lg:gap-12'}>
                <div className={'border-r-4 border-gray-500'}>
                    <p className={'text-2xl text-gray-300 mb-8 mt-4 font-bold'}>{t('billing.categories')}</p>
                    {(!categories || categories.length < 1) && (
                        <div className={'font-semibold my-4 text-gray-400'}>
                            <FontAwesomeIcon icon={faExclamationTriangle} className={'w-5 h-5 mr-2 text-yellow-400'} />
                            {t('billing.noCategories')}
                        </div>
                    )}
                    {categories?.map(cat => (
                        <button
                            className={classNames(
                                'font-semibold my-4 w-full text-left hover:brightness-150 duration-300 cursor-pointer line-clamp-1',
                                Number(cat.id) === category && 'brightness-150',
                            )}
                            disabled={category === Number(cat.id)}
                            style={{ color: colors.primary }}
                            onClick={() => {
                                setCategory(Number(cat.id));
                                setProducts(undefined);
                            }}
                            key={cat.id}
                        >
                            {cat.icon && <img src={cat.icon} className={'w-7 h-7 inline-flex rounded-full mr-3'} />}
                            {cat.name}
                            <div className={'h-0.5 mt-4 bg-gray-600 mr-8 rounded-full'} />
                        </button>
                    ))}
                </div>
                <div className={'lg:col-span-3'}>
                    {!products ? (
                        <Spinner centered />
                    ) : (
                        <>
                            {products?.length < 1 && (
                                <div className={'font-semibold my-4 text-gray-400'}>
                                    <FontAwesomeIcon
                                        icon={faExclamationTriangle}
                                        className={'w-5 h-5 mr-2 text-yellow-400'}
                                    />
                                    {t('billing.noProducts')}
                                </div>
                            )}
                            <div className={'grid grid-cols-1 xl:grid-cols-3 gap-4'}>
                                {products?.map(product => (
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
                                                <span className={'text-base'}>{t('billing.monthly')}</span>
                                            </p>
                                            <div className={'grid justify-center items-center'}>
                                                <LimitBox icon={faMicrochip} limit={<>{product.limits.cpu}% CPU</>} />
                                                <LimitBox
                                                    icon={faMemory}
                                                    limit={<>{t('billing.ram', { amount: product.limits.memory / 1024 })}</>}
                                                />
                                                <LimitBox
                                                    icon={faHdd}
                                                    limit={<>{t('billing.storage', { amount: product.limits.disk / 1024 })}</>}
                                                />
                                                <div className={'border border-dashed border-gray-500 my-4'} />
                                                {product.limits.backup ? (
                                                    <LimitBox
                                                        icon={faArchive}
                                                        limit={<>{t('billing.backupSlots', { count: product.limits.backup })}</>}
                                                    />
                                                ) : (
                                                    <></>
                                                )}
                                                {product.limits.database ? (
                                                    <LimitBox
                                                        icon={faDatabase}
                                                        limit={<>{t('billing.databaseSlots', { count: product.limits.database })}</>}
                                                    />
                                                ) : (
                                                    <></>
                                                )}
                                                <LimitBox
                                                    icon={faEthernet}
                                                    limit={
                                                        <>
                                                            {t('billing.networkPorts', {
                                                                count: product.limits.allocation,
                                                            })}
                                                        </>
                                                    }
                                                />
                                            </div>
                                            <div className={'text-center mt-6'}>
                                                <Link to={`/account/billing/order/${product.id}`}>
                                                    <Button size={Button.Sizes.Large} className={'w-full'}>
                                                        {t('billing.configure')}
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </ContentBox>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </PageContentBlock>
    );
};
