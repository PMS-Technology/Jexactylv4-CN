import { Actions, useStoreActions } from 'easy-peasy';
import { useState } from 'react';
import { deleteRole } from '@/api/routes/admin/roles';
import { Button } from '@/elements/button';
import { ApplicationStore } from '@/state';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from '@/elements/dialog';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import { useTranslation } from 'react-i18next';

interface Props {
    roleId: number;
    onDeleted: () => void;
}

export default ({ roleId, onDeleted }: Props) => {
    const { t } = useTranslation('admin');
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(
        (actions: Actions<ApplicationStore>) => actions.flashes,
    );

    const onDelete = () => {
        setLoading(true);
        clearFlashes('role');

        deleteRole(roleId)
            .then(() => {
                setLoading(false);
                onDeleted();
            })
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'role', error });

                setLoading(false);
                setVisible(false);
            });
    };

    return (
        <>
            <Dialog.Confirm
                open={visible}
                title={t('users.deleteRole') as string}
                confirm={t('users.yesDeleteRole') as string}
                onConfirmed={onDelete}
                onClose={() => setVisible(false)}
                buttonType={'danger'}
            >
                <SpinnerOverlay visible={loading} />
                {t('users.deleteRoleConfirmation') as string}
            </Dialog.Confirm>

            <Button.Danger type={'button'} size={Button.Sizes.Small} onClick={() => setVisible(true)}>
                <FontAwesomeIcon icon={faTrash} />
            </Button.Danger>
        </>
    );
};
