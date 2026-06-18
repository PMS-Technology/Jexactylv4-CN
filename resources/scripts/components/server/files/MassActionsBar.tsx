import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { compressFiles, deleteFiles } from '@/api/routes/server/files';
import { Button } from '@/elements/button';
import { Dialog } from '@/elements/dialog';
import Portal from '@/elements/Portal';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import RenameFileModal from '@server/files/RenameFileModal';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import useFlash from '@/plugins/useFlash';
import { ServerContext } from '@/state/server';
import FadeTransition from '@/elements/transitions/FadeTransition';

const MassActionsBar = () => {
    const { t } = useTranslation('server');
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);

    const { mutate } = useFileManagerSwr();
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showMove, setShowMove] = useState(false);
    const directory = ServerContext.useStoreState(state => state.files.directory);

    const selectedFiles = ServerContext.useStoreState(state => state.files.selectedFiles);
    const setSelectedFiles = ServerContext.useStoreActions(actions => actions.files.setSelectedFiles);

    useEffect(() => {
        if (!loading) setLoadingMessage('');
    }, [loading]);

    const onClickCompress = () => {
        setLoading(true);
        clearFlashes('files');
        setLoadingMessage(t('filesPage.archivingFiles') as string);

        compressFiles(uuid, directory, selectedFiles)
            .then(() => mutate())
            .then(() => setSelectedFiles([]))
            .catch(error => clearAndAddHttpError({ key: 'files', error }))
            .then(() => setLoading(false));
    };

    const onClickConfirmDeletion = () => {
        setLoading(true);
        setShowConfirm(false);
        clearFlashes('files');
        setLoadingMessage(t('filesPage.deletingFiles') as string);

        deleteFiles(uuid, directory, selectedFiles)
            .then(async () => {
                await mutate(files => files!.filter(f => selectedFiles.indexOf(f.name) < 0), false);
                setSelectedFiles([]);
            })
            .catch(async error => {
                await mutate();
                clearAndAddHttpError({ key: 'files', error });
            })
            .then(() => setLoading(false));
    };

    return (
        <>
            <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex justify-center">
                <SpinnerOverlay visible={loading} size={'large'} fixed>
                    {loadingMessage}
                </SpinnerOverlay>
                <Dialog.Confirm
                    title={t('filesPage.deleteFiles') as string}
                    open={showConfirm}
                    confirm={t('filesPage.delete') as string}
                    onClose={() => setShowConfirm(false)}
                    onConfirmed={onClickConfirmDeletion}
                >
                    <p className="mb-2" dangerouslySetInnerHTML={{ __html: t('filesPage.deleteFilesConfirm', { count: selectedFiles.length }) as string }} />
                    {selectedFiles.slice(0, 15).map(file => (
                        <li key={file}>{file}</li>
                    ))}
                    {selectedFiles.length > 15 && <li>and {selectedFiles.length - 15} others</li>}
                </Dialog.Confirm>
                {showMove && (
                    <RenameFileModal
                        files={selectedFiles}
                        visible
                        appear
                        useMoveTerminology
                        onDismissed={() => setShowMove(false)}
                    />
                )}
                <Portal>
                    <div className="pointer-events-none fixed bottom-0 z-50 mb-6 flex w-full justify-center">
                        <FadeTransition duration="duration-75" show={selectedFiles.length > 0} appear unmount>
                            <div className="pointer-events-auto flex items-center space-x-4 rounded bg-black/50 p-4">
                                <Button onClick={() => setShowMove(true)}>{t('filesPage.moveFiles') as string}</Button>
                                <Button onClick={onClickCompress}>{t('filesPage.archiveFiles') as string}</Button>
                                <Button.Danger variant={Button.Variants.Secondary} onClick={() => setShowConfirm(true)}>
                                    {t('filesPage.delete') as string}
                                </Button.Danger>
                            </div>
                        </FadeTransition>
                    </div>
                </Portal>
            </div>
        </>
    );
};

export default MassActionsBar;
