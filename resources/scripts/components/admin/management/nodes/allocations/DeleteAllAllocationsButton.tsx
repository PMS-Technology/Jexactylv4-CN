import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/elements/dialog';
import { Button } from '@/elements/button';
import { deleteAllAllocations } from '@/api/routes/admin/nodes/allocations/deleteAllocation';
import useFlash from '@/plugins/useFlash';
import SpinnerOverlay from '@/elements/SpinnerOverlay';

export default ({ nodeId }: { nodeId: number }) => {
    const { t } = useTranslation('admin');
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const doDeleteAll = () => {
        setLoading(true);
        clearFlashes();

        deleteAllAllocations(nodeId)
            .then(() => window.location.reload())
            .catch(error => {
                setLoading(false);
                clearAndAddHttpError({ key: 'admin:nodes:allocations', error });
            });
    };

    return (
        <>
            <Dialog.Confirm
                open={open}
                buttonType={'danger'}
                onClose={() => setOpen(false)}
                onConfirmed={doDeleteAll}
                confirm={t('nodes.yesDeleteAll') as string}
                title={t('nodes.deleteAllUnusedAllocations') as string}
            >
                <SpinnerOverlay visible={loading} />
                {t('nodes.confirmDeleteAllAllocations') as string}
            </Dialog.Confirm>
            <Button.Danger onClick={() => setOpen(true)}>{t('nodes.deleteAllUnusedAllocations') as string}</Button.Danger>
        </>
    );
};
