import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    faBoxOpen,
    faCloudDownloadAlt,
    faEllipsisH,
    faLock,
    faTrashAlt,
    faUnlock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { getBackupUrl } from '@/api/routes/server/backups';
import useFlash from '@/plugins/useFlash';
import { deleteBackup, restoreBackup, getBackups } from '@/api/routes/server/backups';
import Can from '@/elements/Can';
import tw from 'twin.macro';
import { type Backup } from '@definitions/server';
import { ServerContext } from '@/state/server';
import Input from '@/elements/Input';
import http, { httpErrorToHuman } from '@/api/http';
import { Dialog } from '@/elements/dialog';
import { Button } from '@/elements/button';
import SpinnerOverlay from '@/elements/SpinnerOverlay';

interface Props {
    backup: Backup;
    visible: boolean;
    setVisible: Dispatch<SetStateAction<boolean>>;
}

export default ({ backup, visible, setVisible }: Props) => {
    const { t } = useTranslation('server');
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const setServerFromState = ServerContext.useStoreActions(actions => actions.server.setServerFromState);
    const [modal, setModal] = useState('');
    const [loading, setLoading] = useState(false);
    const [truncate, setTruncate] = useState(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { mutate } = getBackups();

    const doDownload = () => {
        setLoading(true);
        clearFlashes('backups');
        getBackupUrl(uuid, backup.uuid)
            .then(url => {
                // @ts-expect-error this is valid
                window.location = url;
            })
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'backups', error });
            })
            .then(() => setLoading(false));
    };

    const doDeletion = () => {
        setLoading(true);
        clearFlashes('backups');
        deleteBackup(uuid, backup.uuid)
            .then(
                async () =>
                    await mutate(
                        data => ({
                            ...data!,
                            items: data!.items.filter(b => b.uuid !== backup.uuid),
                            backupCount: data!.backupCount - 1,
                        }),
                        false,
                    ),
            )
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'backups', error });
                setLoading(false);
                setModal('');
            });
    };

    const doRestorationAction = () => {
        setLoading(true);
        clearFlashes('backups');
        restoreBackup(uuid, backup.uuid, truncate)
            .then(() =>
                setServerFromState(s => ({
                    ...s,
                    status: 'restoring_backup',
                })),
            )
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'backups', error });
            })
            .then(() => setLoading(false))
            .then(() => setModal(''));
    };

    const onLockToggle = () => {
        if (backup.isLocked && modal !== 'unlock') {
            return setModal('unlock');
        }

        http.post(`/api/client/servers/${uuid}/backups/${backup.uuid}/lock`)
            .then(
                async () =>
                    await mutate(
                        data => ({
                            ...data!,
                            items: data!.items.map(b =>
                                b.uuid !== backup.uuid
                                    ? b
                                    : {
                                          ...b,
                                          isLocked: !b.isLocked,
                                      },
                            ),
                        }),
                        false,
                    ),
            )
            .catch(error => alert(httpErrorToHuman(error)))
            .then(() => setModal(''));
    };

    return (
        <>
            <Dialog.Confirm
                open={modal === 'unlock'}
                onClose={() => setModal('')}
                title={t('backupsPage.unlockTitle', { name: backup.name }) as string}
                onConfirmed={onLockToggle}
            >
                {t('backupsPage.unlockWarning') as string}
            </Dialog.Confirm>
            <Dialog.Confirm
                open={modal === 'restore'}
                onClose={() => setModal('')}
                confirm={t('backupsPage.restore') as string}
                title={t('backupsPage.restoreTitle', { name: backup.name }) as string}
                onConfirmed={() => doRestorationAction()}
            >
                <p>
                    {t('backupsPage.restoreWarning') as string}
                </p>
                <p css={tw`mt-4 -mb-2 bg-slate-700 p-3 rounded`}>
                    <label htmlFor={'restore_truncate'} css={tw`text-base flex items-center cursor-pointer`}>
                        <Input
                            type={'checkbox'}
                            css={tw`text-red-500! w-5! h-5! mr-2`}
                            id={'restore_truncate'}
                            value={'true'}
                            checked={truncate}
                            onChange={() => setTruncate(s => !s)}
                        />
                        {t('backupsPage.deleteAllFiles') as string}
                    </label>
                </p>
            </Dialog.Confirm>
            <Dialog.Confirm
                title={t('backupsPage.deleteTitle', { name: backup.name }) as string}
                confirm={t('consolePage.continue') as string}
                open={modal === 'delete'}
                onClose={() => setModal('')}
                onConfirmed={doDeletion}
            >
                {t('backupsPage.deleteWarning') as string}
            </Dialog.Confirm>
            {!backup.completedAt ? (
                <FontAwesomeIcon
                    size={'lg'}
                    icon={faTrashAlt}
                    className={'text-red-400'}
                    onClick={() => setModal('delete')}
                />
            ) : (
                <FontAwesomeIcon icon={faEllipsisH} onClick={() => setVisible(visible => !visible)} size={'lg'} />
            )}
            <Dialog open={visible} onClose={() => setVisible(false)} title={t('backupsPage.editBackup') as string}>
                <SpinnerOverlay visible={loading} />
                <div css={tw`text-sm grid grid-cols-2 lg:grid-cols-3 gap-4`}>
                    <Can action={'backup.download'}>
                        <Button onClick={doDownload}>
                            <FontAwesomeIcon fixedWidth icon={faCloudDownloadAlt} css={tw`text-xs`} />
                            <span css={tw`ml-2`}>{t('backupsPage.download') as string}</span>
                        </Button>
                    </Can>
                    <Can action={'backup.restore'}>
                        <Button onClick={() => setModal('restore')}>
                            <FontAwesomeIcon fixedWidth icon={faBoxOpen} css={tw`text-xs`} />
                            <span css={tw`ml-2`}>{t('backupsPage.restore') as string}</span>
                        </Button>
                    </Can>
                    <Can action={'backup.delete'}>
                        <>
                            <Button onClick={onLockToggle}>
                                <FontAwesomeIcon
                                    fixedWidth
                                    icon={backup.isLocked ? faUnlock : faLock}
                                    css={tw`text-xs mr-2`}
                                />
                                {backup.isLocked ? (t('backupsPage.unlock') as string) : (t('backupsPage.lock') as string)}
                            </Button>
                            {!backup.isLocked && (
                                <Button.Danger onClick={() => setModal('delete')}>
                                    <FontAwesomeIcon fixedWidth icon={faTrashAlt} css={tw`text-xs`} />
                                    <span css={tw`ml-2`}>{t('backupsPage.delete') as string}</span>
                                </Button.Danger>
                            )}
                        </>
                    </Can>
                </div>
            </Dialog>
        </>
    );
};
