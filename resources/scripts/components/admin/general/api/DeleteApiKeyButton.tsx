import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useFlash from '@/plugins/useFlash';
import { Dialog } from '@/elements/dialog';
import { Button } from '@/elements/button';
import deleteApiKey from '@/api/routes/admin/api/deleteApiKey';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default ({ id }: { id: number }) => {
    const { t } = useTranslation('admin');
    const [visible, setVisible] = useState<boolean>(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();

    const submit = () => {
        clearFlashes('api');

        deleteApiKey(id)
            .then(() => window.location.reload())
            .catch(error => clearAndAddHttpError({ key: 'api', error }));

        setVisible(false);
    };

    return (
        <>
            <Dialog.Confirm
                open={visible}
                onConfirmed={submit}
                onClose={() => setVisible(false)}
                title={t('api.confirmDelete') as string}
            >
                {t('api.confirmDeleteDesc') as string}
            </Dialog.Confirm>
            <Button.Danger className={'mt-2'} size={Button.Sizes.Small} onClick={() => setVisible(true)}>
                <FontAwesomeIcon icon={faTrash} />
            </Button.Danger>
        </>
    );
};
