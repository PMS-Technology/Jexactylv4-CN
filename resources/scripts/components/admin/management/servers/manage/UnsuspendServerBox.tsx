import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from '@/elements/dialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServerFromRoute } from '@/api/routes/admin/server';
import useFlash from '@/plugins/useFlash';
import unsuspendServer from '@/api/routes/admin/servers/manage/unsuspendServer';

export default () => {
    const { t } = useTranslation('admin');
    const { data: server } = useServerFromRoute();
    const [visible, setVisible] = useState<boolean>(false);
    const { addFlash, clearAndAddHttpError } = useFlash();

    if (!server) return null;

    const submit = () => {
        unsuspendServer(server.id)
            .then(() => {
                addFlash({
                    key: 'server:manage',
                    type: 'success',
                    message: 'Your server is now unsuspended.',
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'server:manage',
                    error: `Failed to unsuspend server: ${error.message}`,
                });
            });

        setVisible(false);
    };

    return (
        <>
            <Dialog.Confirm
                title={t('servers.confirmSuspensionRemoval') as string}
                onConfirmed={submit}
                open={visible}
                onClose={() => setVisible(false)}
                confirm={t('servers.iUnderstandProceed') as string}
            >
                {t('servers.areYouSureUnsuspendServer') as string}
            </Dialog.Confirm>
            <div css={tw`h-auto flex flex-col`}>
                <AdminBox icon={faEye} title={t('servers.unsuspendServer') as string} css={tw`relative w-full`}>
                    <Button.Warn size={Button.Sizes.Large} css={tw`w-full`} onClick={() => setVisible(true)}>
                        {t('servers.unsuspendServer') as string}
                    </Button.Warn>
                    <p css={tw`text-xs text-neutral-400 mt-2`}>
                        {t('servers.unsuspendServerDescription') as string}
                    </p>
                </AdminBox>
            </div>
        </>
    );
};
