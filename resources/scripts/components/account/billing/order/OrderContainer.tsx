import Spinner from '@/elements/Spinner';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStoreState } from '@/state/hooks';
import NodeBox from '@account/billing/order/NodeBox';
import EggBox from '@account/billing/order/EggBox';
import PageContentBlock from '@/elements/PageContentBlock';
import VariableBox from '@account/billing/order/VariableBox';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArchive,
    faCheck,
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
import { DiscountCode, Product, type Node, type Egg } from '@definitions/account/billing';
import { getProduct, getProductEggs, getProductVariables, getViableNodes } from '@/api/routes/account/billing/products';
import TitledGreyBox from '@/elements/TitledGreyBox';
import AdminCheckbox from '@/elements/AdminCheckbox';
import { processFreeCheckoutSession } from '@/api/routes/account/billing/orders/process';
import DiscountCodeDialog from './DiscountCodeDialog';
import LimitBox from '@/elements/billing/LimitBox';
import Money from '@/elements/billing/Money';
import { hexToRgba } from '@/lib/helpers';
import { useTranslation } from 'react-i18next';

const StepHeader = ({
    step,
    complete,
    title,
    description,
}: {
    step: number;
    complete: boolean;
    title: ReactNode;
    description: ReactNode;
}) => {
    const { colors } = useStoreState(state => state.theme.data!);

    return (
        <div className={'flex items-start gap-4 mb-4'}>
            <div
                className={'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 font-bold text-sm'}
                style={
                    complete
                        ? { backgroundColor: colors.primary, color: '#fff' }
                        : { backgroundColor: hexToRgba(colors.primary, 0.12), color: colors.primary }
                }
            >
                {complete ? <FontAwesomeIcon icon={faCheck} className={'w-3.5 h-3.5'} /> : step}
            </div>
            <div className={'text-xl lg:text-3xl font-semibold'}>
                {title}
                <p className={'text-gray-400 font-normal text-sm mt-1'}>{description}</p>
            </div>
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
    const [availableEggs, setAvailableEggs] = useState<Egg[] | undefined>();
    const [selectedEgg, setSelectedEgg] = useState<number | undefined>();
    const [variables, setVariables] = useState<EggVariable[] | undefined>();
    const [discountCode, setDiscountCode] = useState<DiscountCode | undefined>();

    const [termsAgreed, setTermsAgreed] = useState<boolean>(false);
    const [privacyAgreed, setPrivacyAgreed] = useState<boolean>(false);

    const needsEggSelection = product?.eggId === null;
    const resolvedEggId = product?.eggId ?? selectedEgg;

    const createFree = () => {
        if (product) {
            const orderVariables = Array.from(vars, ([key, value]) => ({ key, value }));
            processFreeCheckoutSession(product.id, selectedNode, orderVariables, undefined, resolvedEggId)
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
                const firstEligible = nodesData.find(node => (productData.price === 0 ? node.deployableFree : true));
                setSelectedNode(Number(firstEligible?.id) ?? 0);

                if (productData.eggId === null) {
                    const eggsData = await getProductEggs(productData.id);
                    setAvailableEggs(eggsData);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [params.id]);

    useEffect(() => {
        clearFlashes();

        if (!resolvedEggId || variables) return;

        // Fetch product variables (egg data)
        getProductVariables(resolvedEggId)
            .then(data => setVariables(data))
            .catch(error => console.error(error));
    }, [resolvedEggId]);

    if (!product) return <Spinner centered />;

    const finalPrice = (() => {
        if (!discountCode) return product.price;
        if (discountCode.type === 'percentage') {
            return Math.max(0, product.price - (product.price * discountCode.value) / 100).toFixed(2);
        }
        return Math.max(0, product.price - discountCode.value).toFixed(2);
    })();

    const selectedNodeData = nodes?.find(node => Number(node.id) === selectedNode);
    const deploymentFee = selectedNodeData?.deploymentFee ?? 0;
    const grandTotal = Number(finalPrice) + deploymentFee;

    const showVariablesStep = !!variables && variables.length > 1;

    let stepCounter = 1;
    const locationStep = stepCounter++;
    const eggStep = needsEggSelection ? stepCounter++ : undefined;
    const variablesStep = showVariablesStep ? stepCounter++ : undefined;
    const legalStep = stepCounter++;
    const paymentStep = stepCounter++;

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
                    <LimitBox icon={faIdBadge} limit={<>{product.name}</>} />
                    <div className={'font-semibold text-gray-400 text-lg my-1'}>
                        <FontAwesomeIcon icon={faCreditCard} className={'w-4 h-4 inline-flex mr-2 '} />
                        <Money value={Number(finalPrice)} className={'mr-1'} accent />
                        <span className={'text-sm'}>{t('billing.mo')}</span>
                    </div>
                    <div className={'h-0.5 my-4 bg-gray-600 mr-8 rounded-full'} />
                    <LimitBox icon={faMicrochip} limit={<>{product.limits.cpu}% CPU</>} />
                    <LimitBox
                        icon={faMemory}
                        limit={<>{t('billing.memoryLimit', { amount: (product.limits.memory / 1024).toFixed(1) })}</>}
                    />
                    <LimitBox
                        icon={faHdd}
                        limit={<>{t('billing.diskLimit', { amount: (product.limits.disk / 1024).toFixed(1) })}</>}
                    />
                    <div className={'h-0.5 my-4 bg-gray-600 mr-8 rounded-full'} />
                    <LimitBox
                        icon={faArchive}
                        limit={<>{t('billing.backupSlots', { count: product.limits.backup })}</>}
                    />
                    <LimitBox
                        icon={faDatabase}
                        limit={<>{t('billing.databaseSlots', { count: product.limits.database })}</>}
                    />
                    <LimitBox
                        icon={faEthernet}
                        limit={<>{t('billing.networkPorts', { count: product.limits.allocation })}</>}
                    />
                </div>
                <div className={'lg:col-span-6'}>
                    <div>
                        <div className={'my-10'}>
                            <StepHeader
                                step={locationStep}
                                complete={!!selectedNode && (nodes?.length ?? 0) > 0}
                                title={t('billing.chooseLocation')}
                                description={t('billing.chooseLocationDescription')}
                            />
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
                                        disabled={product.price === 0 && !node.deployableFree}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className={'h-px bg-gray-700 rounded-full'} />
                        {needsEggSelection && (
                            <>
                                <div className={'my-10'}>
                                    <StepHeader
                                        step={eggStep!}
                                        complete={!!selectedEgg}
                                        title={t('billing.chooseEgg')}
                                        description={t('billing.chooseEggDescription')}
                                    />
                                    <div className={'grid lg:grid-cols-2 gap-4'}>
                                        {(!availableEggs || availableEggs.length < 1) && (
                                            <Alert type={'danger'} className={'col-span-2'}>
                                                {t('billing.noEggs')}
                                            </Alert>
                                        )}
                                        {availableEggs?.map(egg => (
                                            <EggBox
                                                egg={egg}
                                                key={egg.id}
                                                selected={selectedEgg}
                                                setSelected={setSelectedEgg}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className={'h-px bg-gray-700 rounded-full'} />
                            </>
                        )}
                        {showVariablesStep && (
                            <>
                                <div className={'my-10'}>
                                    <StepHeader
                                        step={variablesStep!}
                                        complete={!!selectedNode && (nodes?.length ?? 0) > 0}
                                        title={t('billing.planVariables')}
                                        description={t('billing.planVariablesDescription')}
                                    />
                                    <div className={'grid lg:grid-cols-2 gap-4'}>
                                        {variables?.map(variable => (
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
                            <StepHeader
                                step={legalStep}
                                complete={termsAgreed && privacyAgreed}
                                title={t('billing.legalDocuments')}
                                description={t('billing.legalDocumentsDescription')}
                            />
                            <div className={'grid lg:grid-cols-2 gap-4'}>
                                <TitledGreyBox title={t('billing.termsAgreement')} className={'relative'}>
                                    {!termsAgreed ? (
                                        <>
                                            {t('billing.clickToAgree')}{' '}
                                            <a href={billing.links.terms} className={'text-blue-400 font-semibold'}>
                                                {t('billing.termsOfService')}{' '}
                                                <FontAwesomeIcon icon={faExternalLinkAlt} />
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
                                                {t('billing.privacyPolicy')}{' '}
                                                <FontAwesomeIcon icon={faExternalLinkAlt} />
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
                            <Alert type={'warning'}>{t('billing.legalRequired')}</Alert>
                        ) : (
                            <>
                                {finalPrice !== 0 ? (
                                    <div className={'mt-10'}>
                                        <StepHeader
                                            step={paymentStep}
                                            complete={false}
                                            title={
                                                <>
                                                    {t('billing.dueToday')}: <Money value={grandTotal} accent />
                                                    {deploymentFee > 0 && (
                                                        <span className={'text-sm text-gray-400 font-normal ml-2'}>
                                                            ({t('billing.includes')} <Money value={deploymentFee} />{' '}
                                                            {t('billing.oneTimeDeploymentFee')})
                                                        </span>
                                                    )}
                                                    {discountCode && (
                                                        <span className={'text-green-400 text-base font-normal ml-3'}>
                                                            {t('billing.discountApplied', { code: discountCode.code })}
                                                        </span>
                                                    )}
                                                </>
                                            }
                                            description={
                                                deploymentFee > 0 ? (
                                                    <>
                                                        {t('billing.then')}{' '}
                                                        <Money value={Number(finalPrice)} suffix={t('billing.mo')} />{' '}
                                                        {t('billing.startingNextBillingCycle')}
                                                    </>
                                                ) : (
                                                    t('billing.payNowDescription')
                                                )
                                            }
                                        />
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
                                                    egg={resolvedEggId}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={'flex w-full mt-8'}>
                                        {needsEggSelection && !selectedEgg ? (
                                            <Alert type={'warning'} className={'w-full'}>
                                                {t('billing.selectEggToContinue')}
                                            </Alert>
                                        ) : (
                                            <>
                                                <p className={'font-semibold text-gray-400'}>
                                                    {t('billing.freeProductDescription')}
                                                </p>
                                                <Button className={'ml-auto'} onClick={createFree}>
                                                    {t('billing.createServer')}
                                                </Button>
                                            </>
                                        )}
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
