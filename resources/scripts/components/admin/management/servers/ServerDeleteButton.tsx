import { TrashIcon } from '@heroicons/react/outline';
import type { Actions } from 'easy-peasy';
import { useStoreActions } from 'easy-peasy';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/elements/button';
import { deleteServerEntry as deleteServer } from '@/api/routes/admin/servers';
import { useServerFromRoute } from '@/api/routes/admin/servers';
import type { ApplicationStore } from '@/state';
import { Dialog } from '@/elements/dialog';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import Checkbox from '@/elements/inputs/Checkbox';
import { Alert } from '@/elements/alert';

export default () => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [force, setForce] = useState(false);
    const { data: server } = useServerFromRoute();

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(
        (actions: Actions<ApplicationStore>) => actions.flashes,
    );

    const onDelete = () => {
        if (!server) return;

        setLoading(true);
        clearFlashes('server');

        deleteServer(server.id, force)
            .then(() => navigate('/admin/servers'))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'server', error });

                setLoading(false);
                setVisible(false);
            });
    };

    if (!server) return null;

    return (
        <>
            <Dialog.Confirm
                open={visible}
                title={t('servers.deleteServerQuestion') as string}
                confirm={t('servers.yesDeleteServer') as string}
                onConfirmed={onDelete}
                onClose={() => setVisible(false)}
            >
                <SpinnerOverlay visible={loading} />
                {t('servers.areYouSureDeleteServer') as string}
                <div className={'bg-black/50 rounded-lg p-4 text-gray-400 mt-4'}>
                    <Checkbox onClick={() => setForce(!force)} className={'mr-1'} />
                    {t('servers.forceDeleteFromPanel') as string}
                </div>
                {force && (
                    <Alert type={'warning'} className={'mt-2'}>
                        {t('servers.forceDeleteWarning') as string}
                    </Alert>
                )}
            </Dialog.Confirm>

            <Button.Danger type="button" onClick={() => setVisible(true)} className="flex items-center justify-center">
                <TrashIcon className="h-5 w-5" />
            </Button.Danger>
        </>
    );
};
