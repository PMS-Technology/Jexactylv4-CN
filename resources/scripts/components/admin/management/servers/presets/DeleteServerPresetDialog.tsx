import { deleteServerPreset } from '@/api/routes/admin/servers';
import { Button } from '@/elements/button';
import { Dialog } from '@/elements/dialog';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import { TrashIcon } from '@heroicons/react/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default ({ id }: { id: number }) => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const [open, setOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    const submit = () => {
        setLoading(true);

        deleteServerPreset(id)
            .then(() => navigate('/admin/servers/presets'))
            .catch(e => console.log(e))
            .finally(() => setLoading(false));
    };

    return (
        <>
            <Dialog.Confirm
                open={open}
                onClose={() => setOpen(false)}
                title={t('servers.confirmPresetDeletion') as string}
                onConfirmed={submit}
                buttonType={'danger'}
            >
                <SpinnerOverlay visible={loading} />
                {t('servers.areYouSureDeletePreset') as string}
            </Dialog.Confirm>
            <Button.Danger onClick={() => setOpen(true)}>
                <TrashIcon className={'w-5 h-5 mr-1'} /> {t('servers.delete') as string}
            </Button.Danger>
        </>
    );
};
