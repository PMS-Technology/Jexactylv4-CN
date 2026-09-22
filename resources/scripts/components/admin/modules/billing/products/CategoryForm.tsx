import type { Actions } from 'easy-peasy';
import { useStoreActions } from 'easy-peasy';
import type { FormikHelpers } from 'formik';
import { Form, Formik, useFormikContext } from 'formik';
import { useNavigate, useParams } from 'react-router-dom';
import Field, { FieldRow } from '@/elements/Field';
import tw from 'twin.macro';
import AdminContentBlock from '@/elements/AdminContentBlock';
import { Button } from '@/elements/button';
import type { ApplicationStore } from '@/state';
import AdminBox from '@/elements/AdminBox';
import { createCategory, updateCategory } from '@/api/routes/admin/billing';
import { object, string, boolean, number } from 'yup';
import { faLayerGroup, faShoppingBasket } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from '@/state/hooks';
import Label from '@/elements/Label';
import { Dispatch, SetStateAction, useState } from 'react';
import CategoryNestEggSelect from './CategoryNestEggSelect';
import { ShoppingCartIcon } from '@heroicons/react/outline';
import CategoryDeleteButton from './CategoryDeleteButton';
import { Category } from '@definitions/admin';
import { CategoryValues } from '@/api/routes/admin/billing';
import { useSWRConfig } from 'swr';
import { useTranslation } from 'react-i18next';

interface Props {
    visible: boolean;
    category?: Category;
    setVisible: Dispatch<SetStateAction<boolean>>;
}

function InternalForm({ category, visible, setVisible }: Props) {
    const { isSubmitting } = useFormikContext<CategoryValues>();
    const { secondary } = useStoreState(state => state.theme.data!.colors);
    const { t } = useTranslation('admin');

    return (
        <Form>
            <div css={tw`grid grid-cols-1 lg:grid-cols-2 gap-4`}>
                <div css={tw`w-full flex flex-col mr-0 lg:mr-2`}>
                    <AdminBox
                        title={t('billingModule.categoryDetails')}
                        icon={faShoppingBasket}
                        isLoading={isSubmitting}
                    >
                        <FieldRow>
                            <Field
                                id={'name'}
                                name={'name'}
                                type={'text'}
                                placeholder={t('billingModule.categoryNamePlaceholder')}
                                label={t('billingModule.categoryName')}
                                description={t('billingModule.simpleTitleForCategory')}
                            />
                            <Field
                                id={'description'}
                                name={'description'}
                                type={'text'}
                                placeholder={t('billingModule.categoryDescriptionPlaceholder')}
                                label={t('billingModule.description')}
                                description={t('billingModule.taglineOrDescriptionForCategory')}
                            />
                            <Field
                                id={'icon'}
                                name={'icon'}
                                type={'text'}
                                label={t('billingModule.icon')}
                                description={t('billingModule.iconDisplayedWithCategory')}
                            />
                            <div className={'mt-1'}>
                                <Label htmlFor={'visible'}>{t('billingModule.visibleOnCreation')}</Label>
                                <div className={'mt-1'}>
                                    <label css={tw`inline-flex items-center mr-2`}>
                                        <Field
                                            name={'visible'}
                                            type={'radio'}
                                            value={'false'}
                                            checked={!visible}
                                            onClick={() => setVisible(false)}
                                        />
                                        <span css={tw`text-neutral-300 ml-2`}>{t('billingModule.no')}</span>
                                    </label>

                                    <label css={tw`inline-flex items-center ml-2`}>
                                        <Field
                                            name={'visible'}
                                            type={'radio'}
                                            value={'true'}
                                            checked={visible}
                                            onClick={() => setVisible(true)}
                                        />
                                        <span css={tw`text-neutral-300 ml-2`}>{t('billingModule.yes')}</span>
                                    </label>
                                </div>
                                <p className={'mt-3 text-xs'}>{t('billingModule.shouldCategoryBeVisibleInstantly')}</p>
                            </div>
                        </FieldRow>
                    </AdminBox>
                </div>
                <div css={tw`w-full flex flex-col mr-0 lg:mr-2`}>
                    <AdminBox
                        title={t('billingModule.serviceConfiguration')}
                        icon={faLayerGroup}
                        isLoading={isSubmitting}
                    >
                        <CategoryNestEggSelect />
                    </AdminBox>
                    <div css={tw`rounded shadow-md mt-4 py-2 pr-6`} style={{ backgroundColor: secondary }}>
                        <div css={tw`text-right`}>
                            {category && <CategoryDeleteButton category={category} />}
                            <Button type={'submit'} css={tw`ml-4`}>
                                {category ? t('billingModule.update') : t('billingModule.create')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Form>
    );
}

export default ({ category }: { category?: Category }) => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const params = useParams<'id'>();
    const { mutate } = useSWRConfig();
    const [visible, setVisible] = useState<boolean>(category?.visible || false);

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(
        (actions: Actions<ApplicationStore>) => actions.flashes,
    );

    const submit = (values: CategoryValues, { setSubmitting }: FormikHelpers<CategoryValues>) => {
        clearFlashes('admin:billing:category:create');

        values.visible = visible;

        createCategory(values)
            .then(data => navigate(`/admin/billing/categories/${data.id}`))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'admin:billing:category:create', error });
            })
            .then(() => setSubmitting(false));
    };

    const update = (values: CategoryValues, { setSubmitting }: FormikHelpers<CategoryValues>) => {
        clearFlashes();

        values.visible = visible;

        updateCategory(category!.id, values)
            .then(async () => {
                // Revalidate the SWR cache to fetch updated category data and wait for it to complete
                await mutate(`/api/application/billing/categories/${params.id}`, undefined, { revalidate: true });
            })
            .catch(error => {
                clearAndAddHttpError({ key: 'admin:billing:category:create', error });
            })
            .then(() => setSubmitting(false));
    };

    return (
        <AdminContentBlock title={t('billingModule.newCategory')}>
            <div css={tw`w-full flex flex-row items-center m-8`}>
                {category?.icon ? (
                    <img src={category.icon} className={'ww-8 h-8 mr-4'} />
                ) : (
                    <ShoppingCartIcon className={'w-8 h-8 mr-4'} />
                )}
                <div css={tw`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 css={tw`text-2xl text-neutral-50 font-header font-medium`}>
                        {category?.name ?? t('billingModule.newProductCategory')}
                    </h2>
                    <p
                        css={tw`hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {category?.uuid ?? t('billingModule.addNewCategoryToBilling')}
                    </p>
                </div>
            </div>
            <Formik<CategoryValues>
                onSubmit={category ? update : submit}
                enableReinitialize={true}
                initialValues={{
                    name: category?.name ?? '',
                    icon: category?.icon ?? '',
                    description: category?.description ?? '',
                    visible: category?.visible ?? false,
                    nestId: category?.nestId ?? null,
                    eggId: category?.eggId ?? null,
                }}
                validationSchema={object().shape({
                    name: string().required().max(191).min(3),
                    icon: string().nullable().max(191).min(3),
                    description: string().nullable().max(191).min(3),
                    visible: boolean().required(),
                    nestId: number().nullable().required(t('billingModule.nestRequiredForCategory')),
                    eggId: number().nullable(),
                })}
            >
                <InternalForm category={category} visible={visible} setVisible={setVisible} />
            </Formik>
        </AdminContentBlock>
    );
};
