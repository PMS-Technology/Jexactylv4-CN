import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWrench, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from '@/elements/dialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import reinstallServer from '@/api/routes/admin/servers/manage/reinstallServer';
import { useServerFromRoute } from '@/api/routes/admin/server';
import useFlash from '@/plugins/useFlash';

export default () => {
    const { t } = useTranslation('admin');
    const { data: server } = useServerFromRoute();
    const [visible, setVisible] = useState<boolean>(false);
    const { addFlash, clearAndAddHttpError } = useFlash();

    if (!server) return null;

    const submit = () => {
        reinstallServer(server.id)
            .then(() => {
                addFlash({
                    key: 'server:manage',
                    type: 'success',
                    message: 'This server will begin the reinstallation process now.',
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'server:manage',
                    error: `Failed to reinstall server: ${error.message}`,
                });
            });

        setVisible(false);
    };

    return (
        <>
            <Dialog.Confirm
                title={t('servers.confirmReinstallation') as string}
                onConfirmed={submit}
                open={visible}
                onClose={() => setVisible(false)}
                confirm={t('servers.iUnderstandProceed') as string}
            >
                {t('servers.areYouSureReinstallServer') as string}
            </Dialog.Confirm>
            <div css={tw`h-auto flex flex-col`}>
                <AdminBox icon={faWrench} title={t('servers.reinstallServer') as string} css={tw`relative w-full`}>
                    <Button.Danger size={Button.Sizes.Large} css={tw`w-full`} onClick={() => setVisible(true)}>
                        {t('servers.reinstallServer') as string}
                    </Button.Danger>
                    <p css={tw`text-xs text-neutral-400 mt-2`}>
                        {t('servers.reinstallServerDescription') as string}
                        <br />
                        <FontAwesomeIcon icon={faExclamationTriangle} className={'mr-1 text-red-500'} />
                        {t('servers.couldOverwriteData') as string}
                    </p>
                </AdminBox>
            </div>
        </>
    );
};
