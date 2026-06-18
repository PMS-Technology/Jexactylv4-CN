import type { Actions } from 'easy-peasy';
import { useStoreActions } from 'easy-peasy';
import type { FormikHelpers } from 'formik';
import { Form, Formik } from 'formik';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Field, { FieldRow } from '@/elements/Field';
import tw from 'twin.macro';
import AdminContentBlock from '@/elements/AdminContentBlock';
import { Button } from '@/elements/button';
import type { ApplicationStore } from '@/state';
import AdminBox from '@/elements/AdminBox';
import { object, string, number } from 'yup';
import { faArrowLeft, faBell, faMicrochip, faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from '@/state/hooks';
import { createProduct, updateProduct } from '@/api/routes/admin/billing/products';
import ProductDeleteButton from './ProductDeleteButton';
import { CubeIcon } from '@heroicons/react/outline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { getCategory } from '@/api/routes/admin/billing/categories';
import { Product } from '@definitions/admin';
import { ProductValues } from '@/api/routes/admin/billing/types';
import { Alert } from '@/elements/alert';
import { useTranslation } from 'react-i18next';

export default ({ product }: { product?: Product }) => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const params = useParams<'id'>();
    const [uuid, setUuid] = useState<string>();

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(
        (actions: Actions<ApplicationStore>) => actions.flashes,
    );
    const { secondary } = useStoreState(state => state.theme.data!.colors);

    const submit = (values: ProductValues, { setSubmitting }: FormikHelpers<ProductValues>) => {
        clearFlashes('admin:billing:product:create');

        if (!product) {
            createProduct(Number(params.id), values)
                .then(data => {
                    setSubmitting(false);
                    navigate(`/admin/billing/categories/${params.id}/products/${data.id}`);
                })
                .catch(error => {
                    setSubmitting(false);
                    clearAndAddHttpError({ key: 'admin:billing:product:create', error });
                });
        } else {
            updateProduct(Number(params.id), product!.id, values)
                .then(() => {
                    setSubmitting(false);
                    navigate(`/admin/billing/categories/${params.id}`);
                })
                .catch(error => {
                    setSubmitting(false);
                    clearAndAddHttpError({ key: 'admin:billing:product:create', error });
                });
        }
    };

    useEffect(() => {
        getCategory(Number(params.id)).then(category => setUuid(category.uuid));
    }, [params.id]);

    return (
        <AdminContentBlock title={product ? t('billingModule.editProduct') : t('billingModule.newProduct')}>
            <div css={tw`w-full flex flex-row items-center m-8`}>
                {product?.icon ? (
                    <img src={product.icon} className={'ww-8 h-8 mr-4'} />
                ) : (
                    <CubeIcon className={'w-8 h-8 mr-4'} />
                )}
                <div css={tw`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 css={tw`text-2xl text-neutral-50 font-header font-medium`}>{product?.name ?? t('billingModule.newProduct')}</h2>
                    <p
                        css={tw`hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {product?.uuid ?? t('billingModule.addNewProductToBilling')}
                    </p>
                </div>
                {product && (
                    <div className={'hidden md:flex ml-auto mr-12'}>
                        <Link to={`/admin/billing/categories/${Number(params.id)}`}>
                            <Button>
                                <FontAwesomeIcon icon={faArrowLeft} className={'mr-2'} />
                                {t('billingModule.returnToCategory')}
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
            <Formik
                onSubmit={submit}
                initialValues={{
                    categoryUuid: uuid!,
                    name: product?.name ?? 'Plan Name',
                    icon: product?.icon ?? undefined,
                    // @ts-expect-error this is fine
                    price: product?.price?.toString() ?? '9.99',
                    description: product?.description ?? 'This is a server plan.',
                    limits: {
                        cpu: product?.limits.cpu ?? 100,
                        memory: product?.limits.memory ?? 1024,
                        disk: product?.limits.disk ?? 4096,
                        backup: product?.limits.backup ?? 0,
                        database: product?.limits.database ?? 0,
                        allocation: product?.limits.allocation ?? 1,
                    },
                }}
                validationSchema={object().shape({
                    name: string().required().max(191).min(3),
                    icon: string().nullable().max(191).min(3),
                    price: number().typeError('Price must be a number').required().min(0, 'Price cannot be negative'),
                    description: string().nullable().max(191).min(3),
                    limits: object().shape({
                        cpu: number().required().min(10),
                        memory: number().required().min(128),
                        disk: number().required().min(128),
                        backup: number().required().min(0),
                        database: number().required().min(0),
                        allocation: number().required().min(1),
                    }),
                })}
            >
                {({ values, isSubmitting, isValid, handleChange }) => (
                    <Form>
                        <div css={tw`grid grid-cols-1 lg:grid-cols-2 gap-4`}>
                            <div css={tw`w-full flex flex-col mr-0 lg:mr-2`}>
                                <AdminBox title={t('billingModule.generalDetails')} icon={faPuzzlePiece}>
                                    <FieldRow>
                                        <Field
                                            id={'name'}
                                            name={'name'}
                                            type={'text'}
                                            label={t('billingModule.name')}
                                            description={t('billingModule.simpleNameToIdentifyProduct')}
                                        />
                                        <Field
                                            id={'description'}
                                            name={'description'}
                                            type={'text'}
                                            label={t('billingModule.description')}
                                            description={t('billingModule.taglineOrDescriptionForProduct')}
                                        />
                                        <Field
                                            id={'icon'}
                                            name={'icon'}
                                            type={'text'}
                                            label={t('billingModule.icon')}
                                            description={t('billingModule.iconDisplayedWithProduct')}
                                        />
                                        <Field
                                            id={'price'}
                                            name={'price'}
                                            type={'text'} // changed from number to text
                                            onChange={handleChange}
                                            label={t('billingModule.monthlyCost')}
                                            description={
                                                t('billingModule.costOfProductMonthly')
                                            }
                                        />
                                    </FieldRow>
                                </AdminBox>
                                <AdminBox title={t('billingModule.resourceLimits')} className={'lg:mt-4'} icon={faMicrochip}>
                                    <FieldRow>
                                        <Field
                                            id={'limits.cpu'}
                                            name={'limits.cpu'}
                                            type={'text'}
                                            label={t('billingModule.cpuLimit')}
                                            description={t('billingModule.cpuThreadServerCanUse')}
                                        />
                                        <Field
                                            id={'limits.memory'}
                                            name={'limits.memory'}
                                            type={'text'}
                                            label={t('billingModule.memoryLimit')}
                                            description={t('billingModule.memoryServerAllowedToUse')}
                                        />
                                        <Field
                                            id={'limits.disk'}
                                            name={'limits.disk'}
                                            type={'text'}
                                            label={t('billingModule.diskLimit')}
                                            description={t('billingModule.diskServerAllowedToUse')}
                                        />
                                    </FieldRow>
                                </AdminBox>
                            </div>
                            <div css={tw`w-full flex flex-col mr-0 lg:mr-2`}>
                                <AdminBox title={t('billingModule.featureLimits')} icon={faBell}>
                                    <FieldRow>
                                        <Field
                                            id={'limits.backup'}
                                            name={'limits.backup'}
                                            type={'text'}
                                            label={t('billingModule.backupLimit')}
                                            description={t('billingModule.backupsProductCanHave')}
                                        />
                                        <Field
                                            id={'limits.database'}
                                            name={'limits.database'}
                                            type={'text'}
                                            label={t('billingModule.databaseLimit')}
                                            description={t('billingModule.databasesProductCanHave')}
                                        />
                                        <Field
                                            id={'limits.allocation'}
                                            name={'limits.allocation'}
                                            type={'text'}
                                            label={t('billingModule.allocationPortLimit')}
                                            description={t('billingModule.portsProductCanHave')}
                                        />
                                    </FieldRow>
                                </AdminBox>
                                {/* Dynamic alerts based on price */}
                                {Number(values.price) === 0 && (
                                    <Alert type={'warning'} className={'mt-4'}>
                                        {t('billingModule.productSetToFreeConfirmChoice')}
                                    </Alert>
                                )}
                                {Number(values.price) === 0 && (
                                    <Alert type={'info'} className={'mt-4'}>
                                        {t('billingModule.productFreeUsersCanOnlyUseOnce')}
                                    </Alert>
                                )}
                                <div css={tw`rounded shadow-md mt-4 py-2 pr-6`} style={{ backgroundColor: secondary }}>
                                    <div css={tw`text-right`}>
                                        {product && <ProductDeleteButton product={product} />}
                                        <Button type={'submit'} disabled={isSubmitting || !isValid}>
                                            {product ? t('billingModule.updateProduct') : t('billingModule.createProduct')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        </AdminContentBlock>
    );
};
