import { deleteCategory } from '@/api/routes/admin/billing/categories';
import FlashMessageRender from '@/elements/FlashMessageRender';
import Input from '@/elements/Input';
import { Button } from '@/elements/button';
import { Dialog } from '@/elements/dialog';
import { useTranslation } from 'react-i18next';
import useFlash from '@/plugins/useFlash';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category } from '@definitions/admin';

export default ({ category }: { category: Category }) => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const [name, setName] = useState<string>('');
    const [open, setOpen] = useState<boolean>(false);
    const { clearFlashes, addFlash, clearAndAddHttpError } = useFlash();

    const doDeletion = () => {
        clearFlashes();

        if (name !== category.name) {
            addFlash({
                type: 'error',
                key: 'admin:billing:categories:delete',
                message: t('billingModule.categoryNameDoesNotMatch'),
            });

            return;
        }

        deleteCategory(category.id)
            .then(() => navigate('/admin/billing/categories'))
            .catch(error => clearAndAddHttpError({ key: 'admin:billing:categories:delete', error }));
    };

    return (
        <>
            <Dialog.Confirm
                open={open}
                onConfirmed={doDeletion}
                onClose={() => setOpen(false)}
                title={t('billingModule.confirmCategoryDeletion')}
            >
                <FlashMessageRender byKey={'admin:billing:categories:delete'} className={'mb-2'} />
                {t('billingModule.areYouSureYouWantToDeleteCategory')}<span className={'p-1 bg-zinc-900 rounded font-mono text-sm mx-1'}>({category.name})</span>{t('billingModule.below')}:
                <Input onChange={e => setName(e.currentTarget.value)} className={'mt-2'} />
            </Dialog.Confirm>
            <Button.Danger type={'button'} onClick={() => setOpen(true)}>
                {t('billingModule.deleteCategoryAndProducts')}
            </Button.Danger>
        </>
    );
};
