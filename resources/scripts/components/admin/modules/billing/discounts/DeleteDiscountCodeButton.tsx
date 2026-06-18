import { deleteDiscountCode } from '@/api/routes/admin/billing/discount-codes';
import { Button } from '@/elements/button';
import { Dialog } from '@/elements/dialog';
import { useTranslation } from 'react-i18next';
import useFlash from '@/plugins/useFlash';
import { useState } from 'react';

export default ({ id }: { id: number }) => {
    const { t } = useTranslation('admin');
    const { clearFlashes, addFlash } = useFlash();
    const [open, setOpen] = useState<boolean>(false);

    const submit = () => {
        clearFlashes();

        deleteDiscountCode(id)
            .then(() => {
                addFlash({
                    key: 'admin:billing:discount-codes',
                    message: t('billingModule.discountCodeRemovedSuccessfully'),
                    type: 'success',
                });
            })
            .finally(() => setOpen(false));
    };

    return (
        <>
            <Dialog.Confirm
                open={open}
                onClose={() => setOpen(false)}
                title={t('billingModule.confirmDiscountCodeDeletion')}
                onConfirmed={submit}
            >
                {t('billingModule.areYouSureYouWishToDeleteDiscountCode')}
            </Dialog.Confirm>
            <Button.Danger className={'ml-2'} type={'button'} size={Button.Sizes.Small} onClick={() => setOpen(true)}>
                {t('billingModule.delete')}
            </Button.Danger>
        </>
    );
};
