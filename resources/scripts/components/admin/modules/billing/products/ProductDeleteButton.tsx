import { deleteProduct } from '@/api/routes/admin/billing';
import FlashMessageRender from '@/elements/FlashMessageRender';
import Input from '@/elements/Input';
import { Button } from '@/elements/button';
import { Dialog } from '@/elements/dialog';
import { useTranslation } from 'react-i18next';
import useFlash from '@/plugins/useFlash';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Product } from '@definitions/admin';

export default ({ product }: { product: Product }) => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const params = useParams<'id'>();
    const [name, setName] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const { clearFlashes, addFlash, clearAndAddHttpError } = useFlash();

    const doDeletion = () => {
        clearFlashes();

        if (name !== product.name) {
            addFlash({
                type: 'error',
                key: 'admin:billing:products:delete',
                message: t('billingModule.productNameDoesNotMatch'),
            });

            return;
        }

        deleteProduct(Number(params.id), product.id)
            .then(() => navigate(`/admin/billing/categories/${params.id}`))
            .catch(error => clearAndAddHttpError({ key: 'admin:billing:products:delete', error }));
    };

    return (
        <>
            <Dialog.Confirm
                open={open}
                onConfirmed={doDeletion}
                onClose={() => setOpen(false)}
                title={t('billingModule.confirmProductDeletion')}
            >
                <FlashMessageRender byKey={'admin:billing:products:delete'} className={'mb-2'} />
                {t('billingModule.areYouSureYouWantToDeleteProduct')}<span className={'p-1 bg-zinc-900 rounded font-mono text-sm mx-1'}>({product.name})</span>{t('billingModule.below')}:
                <Input onChange={e => setName(e.currentTarget.value)} className={'mt-2'} />
            </Dialog.Confirm>
            <Button.Danger className={'mr-4'} type={'button'} onClick={() => setOpen(true)}>
                <FontAwesomeIcon icon={faTrash} className={'mr-1'} /> {t('billingModule.delete')}
            </Button.Danger>
        </>
    );
};
