import Spinner from '@/elements/Spinner';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStoreState } from '@/state/hooks';
import NodeBox from '@account/billing/order/NodeBox';
import PageContentBlock from '@/elements/PageContentBlock';
import VariableBox from '@account/billing/order/VariableBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
    faArchive,
    faCreditCard,
    faDatabase,
    faEthernet,
    faExternalLinkAlt,
    faHdd,
    faIdBadge,
    faMemory,
    faMicrochip,
} from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@/elements/alert';
import useFlash from '@/plugins/useFlash';
import PaymentButton from './PaymentButton';
import { EggVariable } from '@definitions/server';
import { Button } from '@/elements/button';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { DiscountCode, Product, type Node } from '@definitions/account/billing';
import { getProduct, getProductVariables, getViableNodes } from '@/api/routes/account/billing/products';
import TitledGreyBox from '@/elements/TitledGreyBox';
import AdminCheckbox from '@/elements/AdminCheckbox';
import { processFreeCheckoutSession } from '@/api/routes/account/billing/orders/process';
import DiscountCodeDialog from './DiscountCodeDialog';
import { useTranslation } from 'react-i18next';

const LimitBox = ({ icon, content }: { icon: IconDefinition; content: string }) => {
    return (
        <div className={'font-semibold text-gray-400 my-1'}>
            <FontAwesomeIcon icon={icon} className={'w-4 h-4 inline-flex mr-2 '} />
            {content}
        </div>
    );
};

export default () => {
    const { t } = useTranslation('dashboard');
    const params = useParams<'id'>();

    const vars = useRef(new Map<string, string>()).current;
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const navigate = useNavigate();

    const billing = useStoreState(state => state.everest.data!.billing);

    const [nodes, setNodes] = useState<Node[] | undefined>();
    const [selectedNode, setSelectedNode] = useState<number>(0);
    const [product, setProduct] = useState<Product | undefined>();
    const [eggs, setEggs] = useState<EggVariable[] | undefined>();
    const [discountCode, setDiscountCode] = useState<DiscountCode | undefined>();

    const [termsAgreed, setTermsAgreed] = useState<boolean>(false);
    const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(false);

    const { colors } = useStoreState(state => state.theme.data!);

    const createFree = () => {
        if (product) {
            const variables = Array.from(vars, ([key, value]) => ({ key, value }));
            processFreeCheckoutSession(product.id, selectedNode, variables, undefined)
                .then(() => navigate('/'))
                .catch(error => clearAndAddHttpError({ key: 'account:billing:order', error }));
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const productData = await getProduct(Number(params.id));
                setProduct(productData);

                const nodesData = await getViableNodes(productData.id);
                setNodes(nodesData);
                setSelectedNode(Number(nodesData[0]?.id) ?? 0);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [params.id]);

    useEffect(() => {
        clearFlashes();

        if (!product || eggs) return;

        // Fetch product variables (egg data)
        getProductVariables(Number(product.eggId))
            .then(data => setEggs(data))
            .catch(error => console.error(error));
    }, [product]);

    if (!product) return <Spinner centered />;

    const finalPrice = (() => {
        if (!discountCode) return product.price;
        if (discountCode.type === 'percentage') {
            return Math.max(0, product.price - (product.price * discountCode.value) / 100).toFixed(2);
        }
        return Math.max(0, product.price - discountCode.value).toFixed(2);
    })();

    return (
        <PageContentBlock title={t('billing.yourOrder')}>
            <FlashMessageRender byKey={'account:billing:order'} className={'mb-4'} />
            <div className={'text-3xl lg:text-5xl font-bold mt-8 mb-12'}>
                {t('billing.yourOrder')}
                <p className={'text-gray-400 font-normal text-sm mt-1'}>{t('billing.yourOrderDescription')}</p>
            </div>
            <div className={'grid lg:grid-cols-8 gap-4 lg:gap-12'}>
                <div className={'lg:border-r-4 border-gray-500 lg:col-span-2'}>
                    <p className={'text-2xl text-gray-300 my-4 font-bold'}>
                        {t('billing.selectedPlan')}
                        {product.icon && <img src={product.icon} className={'w-8 h-8 ml-2 inline-flex'} />}
                    </p>
                    <LimitBox icon={faIdBadge} content={product.name} />
                    <div className={'font-semibold text-gray-400 text-lg my-1'}>
                        <FontAwesomeIcon icon={faCreditCard} className={'w-4 h-4 inline-flex mr-2 '} />
                        <span style={{ color: colors.primary }} className={'mr-1'}>
                            {billing.currency.symbol}
                            {finalPrice} {billing.currency.code.toUpperCase()}
                        </span>
                        <span className={'text-sm'}>{t('billing.mo')}</span>
                    </div>
                    <div className={'h-0.5 my-4 bg-gray-600 mr-8 rounded-full'} />
                    <LimitBox icon={faMicrochip} content={`${product.limits.cpu}% CPU`} />
                    <LimitBox
                        icon={faMemory}
                        content={t('billing.memoryLimit', { amount: (product.limits.memory / 1024).toFixed(1) })}
                    />
                    <LimitBox
                        icon={faHdd}
                        content={t('billing.diskLimit', { amount: (product.limits.disk / 1024).toFixed(1) })}
                    />
                    <div className={'h-0.5 my-4 bg-gray-600 mr-8 rounded-full'} />
                    <LimitBox icon={faArchive} content={t('billing.backupSlots', { count: product.limits.backup })} />
                    <LimitBox icon={faDatabase} content={t('billing.databaseSlots', { count: product.limits.database })} />
                    <LimitBox icon={faEthernet} content={t('billing.networkPorts', { count: product.limits.allocation })} />
                </div>
                <div className={'lg:col-span-6'}>
                    <div>
                        <div className={'my-10'}>
                            <div className={'text-xl lg:text-3xl font-semibold mb-4'}>
                                {t('billing.chooseLocation')}
                                <p className={'text-gray-400 font-normal text-sm mt-1'}>{t('billing.chooseLocationDescription')}</p>
                            </div>
                            <div className={'grid lg:grid-cols-2 gap-4'}>
                                {(!nodes || nodes.length < 1) && (
                                    <Alert type={'danger'} className={'col-span-2'}>
                                        {t('billing.noDeploymentNodes')}
                                    </Alert>
                                )}
                                {nodes?.map(node => (
                                    <NodeBox
                                        node={node}
                                        key={node.id}
                                        selected={selectedNode}
                                        setSelected={setSelectedNode}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className={'h-px bg-gray-700 rounded-full'} />
                        {eggs && eggs.length > 1 && (
                            <>
                                <div className={'my-10'}>
                                    <div className={'text-xl lg:text-3xl font-semibold mb-4'}>
                                        {t('billing.planVariables')}
                                        <p className={'text-gray-400 font-normal text-sm mt-1'}>{t('billing.planVariablesDescription')}</p>
                                    </div>
                                    <div className={'grid lg:grid-cols-2 gap-4'}>
                                        {eggs?.map(variable => (
                                            <div key={variable.envVariable}>
                                                {variable.isEditable && <VariableBox variable={variable} vars={vars} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className={'h-px bg-gray-700 rounded-full'} />
                            </>
                        )}
                        <div className={'my-10'}>
                            <div className={'text-xl lg:text-3xl font-semibold mb-4'}>
                                {t('billing.legalDocuments')}
                                <p className={'text-gray-400 font-normal text-sm mt-1'}>{t('billing.legalDocumentsDescription')}</p>
                            </div>
                            <div className={'grid lg:grid-cols-2 gap-4'}>
                                <TitledGreyBox title={t('billing.termsAgreement')} className={'relative'}>
                                    {!termsAgreed ? (
                                        <>
                                            {t('billing.clickToAgree')}{' '}
                                            <a href={billing.links.terms} className={'text-blue-400 font-semibold'}>
                                                {t('billing.termsOfService')} <FontAwesomeIcon icon={faExternalLinkAlt} />
                                            </a>
                                        </>
                                    ) : (
                                        <Alert type={'success'}>{t('billing.termsCompleted')}</Alert>
                                    )}
                                    {!termsAgreed && (
                                        <div className={'absolute top-0 right-0 p-3'}>
                                            <AdminCheckbox
                                                name={'terms'}
                                                checked={false}
                                                onChange={() => setTermsAgreed(true)}
                                            />
                                        </div>
                                    )}
                                </TitledGreyBox>
                                <TitledGreyBox title={t('billing.privacyAgreement')} className={'relative'}>
                                    {!privacyAgreed ? (
                                        <>
                                            {t('billing.clickToAgree')}{' '}
                                            <a href={billing.links.privacy} className={'text-blue-400 font-semibold'}>
                                                {t('billing.privacyPolicy')} <FontAwesomeIcon icon={faExternalLinkAlt} />
                                            </a>
                                        </>
                                    ) : (
                                        <Alert type={'success'}>{t('billing.privacyCompleted')}</Alert>
                                    )}
                                    {!privacyAgreed && (
                                        <div className={'absolute top-0 right-0 p-3'}>
                                            <AdminCheckbox
                                                name={'privacy'}
                                                checked={false}
                                                onChange={() => setPrivacyAgreed(true)}
                                            />
                                        </div>
                                    )}
                                </TitledGreyBox>
                            </div>
                        </div>
                        <div className={'h-px bg-gray-700 rounded-full'} />
                        {!termsAgreed || !privacyAgreed ? (
                            <Alert type={'warning'}>
                                {t('billing.legalRequired')}
                            </Alert>
                        ) : (
                            <>
                                {finalPrice !== 0 ? (
                                    <div className={'mt-10'}>
                                        <div className={'text-xl lg:text-3xl font-semibold mb-4'}>
                                            {t('billing.dueToday')}: {billing.currency.symbol}
                                            {finalPrice} {billing.currency.code.toUpperCase()}
                                            {discountCode && (
                                                <span className={'text-green-400 text-base font-normal ml-3'}>
                                                    {t('billing.discountApplied', { code: discountCode.code })}
                                                </span>
                                            )}
                                            <p className={'text-gray-400 font-normal text-sm mt-1'}>{t('billing.payNowDescription')}</p>
                                        </div>
                                        <div className={'flex justify-between w-full mt-8'}>
                                            <DiscountCodeDialog
                                                discountCode={discountCode}
                                                setDiscountCode={setDiscountCode}
                                            />
                                            <div className={'ml-auto'}>
                                                <PaymentButton
                                                    node={selectedNode}
                                                    product={product}
                                                    vars={vars}
                                                    discount_code={discountCode?.code}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={'flex w-full mt-8'}>
                                        <p className={'font-semibold text-gray-400'}>
                                            {t('billing.freeProductDescription')}
                                        </p>
                                        <Button className={'ml-auto'} onClick={createFree}>
                                            {t('billing.createServer')}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </PageContentBlock>
    );
};
