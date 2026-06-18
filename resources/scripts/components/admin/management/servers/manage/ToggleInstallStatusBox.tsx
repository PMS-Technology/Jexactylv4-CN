import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from '@/elements/dialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useServerFromRoute } from '@/api/routes/admin/server';
import useFlash from '@/plugins/useFlash';
import toggleInstallStatus from '@/api/routes/admin/servers/manage/toggleInstallStatus';

export default () => {
    const { t } = useTranslation('admin');
    const { data: server } = useServerFromRoute();
    const [visible, setVisible] = useState<boolean>(false);
    const { addFlash, clearAndAddHttpError } = useFlash();

    if (!server) return null;

    const submit = () => {
        toggleInstallStatus(server.id)
            .then(() => {
                addFlash({
                    key: 'server:manage',
                    type: 'success',
                    message: "This server's install state has been toggled.",
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'server:manage',
                    error: `Failed to change server install state: ${error.message}`,
                });
            });

        setVisible(false);
    };

    return (
        <>
            <Dialog.Confirm
                title={t('servers.confirmInstallStatusChange') as string}
                onConfirmed={submit}
                open={visible}
                onClose={() => setVisible(false)}
                confirm={t('servers.iUnderstandProceed') as string}
            >
                {t('servers.areYouSureChangeInstallStatus') as string}
            </Dialog.Confirm>
            <div css={tw`h-auto flex flex-col`}>
                <AdminBox icon={faDownload} title={t('servers.installStatus') as string} css={tw`relative w-full`}>
                    <Button.Info size={Button.Sizes.Large} css={tw`w-full`} onClick={() => setVisible(true)}>
                        {t('servers.setServerAs') as string} {server.status === 'installing' ? (t('servers.active') as string) : (t('servers.installing') as string)}
                    </Button.Info>
                    <p css={tw`text-xs text-neutral-400 mt-2`}>
                        {t('servers.changeInstallStateDescription') as string}&nbsp;
                        <span className={'text-blue-400'}>
                            {server.status === 'installing' ? (t('servers.installing') as string) : (t('servers.active') as string)}
                        </span>
                        .
                    </p>
                </AdminBox>
            </div>
        </>
    );
};
