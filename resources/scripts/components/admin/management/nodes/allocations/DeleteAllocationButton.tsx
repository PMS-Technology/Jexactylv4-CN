import type { Actions } from 'easy-peasy';
import { useTranslation } from 'react-i18next';
import { useStoreActions } from 'easy-peasy';
import { useState } from 'react';
import deleteAllocation from '@/api/routes/admin/nodes/allocations/deleteAllocation';
import { Button } from '@/elements/button';
import type { ApplicationStore } from '@/state';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from '@/elements/dialog';

interface Props {
    nodeId: number;
    allocationId: number;
    onDeleted?: () => void;
}

export default ({ nodeId, allocationId, onDeleted }: Props) => {
    const { t } = useTranslation('admin');
    const [visible, setVisible] = useState(false);

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(
        (actions: Actions<ApplicationStore>) => actions.flashes,
    );

    const onDelete = () => {
        clearFlashes('allocation');

        deleteAllocation(nodeId, allocationId)
            .then(() => {
                setVisible(false);
                if (onDeleted !== undefined) {
                    onDeleted();
                }
            })
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'allocation', error });

                setVisible(false);
            });
    };

    return (
        <>
            <Dialog.Confirm
                open={visible}
                title={t('nodes.deleteAllocation') as string}
                confirm={t('nodes.yesDeleteAllocation') as string}
                onConfirmed={onDelete}
                onClose={() => setVisible(false)}
            >
                {t('nodes.confirmDeleteAllocation') as string}
            </Dialog.Confirm>

            <Button.Danger type={'button'} size={Button.Sizes.Small} onClick={() => setVisible(true)}>
                <FontAwesomeIcon icon={faTrash} />
            </Button.Danger>
        </>
    );
};
