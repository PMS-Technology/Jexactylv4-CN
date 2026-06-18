import Spinner from '@/elements/Spinner';
import AdminContentBlock from '@/elements/AdminContentBlock';
import { useProductFromRoute } from '@/api/routes/admin/billing/products';
import ProductForm from '@admin/modules/billing/products/ProductForm';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    const { data: product } = useProductFromRoute();

    if (!product) return <Spinner centered />;

    return (
        <AdminContentBlock title={t('billingModule.viewProduct')}>
            <ProductForm product={product} />
        </AdminContentBlock>
    );
};
