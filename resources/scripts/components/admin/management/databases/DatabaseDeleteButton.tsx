import { useStoreActions } from 'easy-peasy';
import { useState } from 'react';
import deleteDatabase from '@/api/routes/admin/databases/deleteDatabase';
import { Button } from '@/elements/button';
import { Shape } from '@/elements/button/types';
import ConfirmationModal from '@/elements/ConfirmationModal';
import { TrashIcon } from '@heroicons/react/outline';
import { useTranslation } from 'react-i18next';

interface Props {
    databaseId: number;
    onDeleted: () => void;
}

export default ({ databaseId, onDeleted }: Props) => {
    const { t } = useTranslation('admin');
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(actions => actions.flashes);

    const onDelete = () => {
        setLoading(true);
        clearFlashes('admin:databases');

        deleteDatabase(databaseId)
            .then(() => {
                setLoading(false);
                onDeleted();
            })
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'admin:databases', error });

                setLoading(false);
                setVisible(false);
            });
    };

    return (
        <>
            <ConfirmationModal
                visible={visible}
                title={t('databases.deleteDatabaseHost') as string}
                buttonText={t('databases.yesDeleteDatabaseHost') as string}
                onConfirmed={onDelete}
                showSpinnerOverlay={loading}
                onModalDismissed={() => setVisible(false)}
            >
                {t('databases.deleteDatabaseHostConfirmation') as string}
            </ConfirmationModal>

            <Button.Danger type="button" shape={Shape.IconSquare} onClick={() => setVisible(true)}>
                <TrashIcon className={'w-5 h-5'} />
            </Button.Danger>
        </>
    );
};
