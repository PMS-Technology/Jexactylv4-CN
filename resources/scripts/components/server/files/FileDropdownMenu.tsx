import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import RenameFileModal from '@server/files/RenameFileModal';
import { ServerContext } from '@/state/server';
import { join } from 'pathe';
import { deleteFiles, copyFile, getFileDownloadUrl, compressFiles, decompressFiles } from '@/api/routes/server/files';
import Can from '@/elements/Can';
import { type FileObject } from '@definitions/server';
import useFlash from '@/plugins/useFlash';
import tw from 'twin.macro';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import DropdownMenu from '@/elements/DropdownMenu';
import useEventListener from '@/plugins/useEventListener';
import isEqual from 'react-fast-compare';
import ChmodFileModal from '@server/files/ChmodFileModal';
import { Dialog } from '@/elements/dialog';
import { Button } from '@/elements/button';
import {
    ArchiveIcon,
    ArrowUpIcon,
    ClipboardCopyIcon,
    CogIcon,
    DownloadIcon,
    InboxIcon,
    PencilIcon,
    TrashIcon,
} from '@heroicons/react/outline';

type ModalType = 'rename' | 'move' | 'chmod';

const FileDropdownMenu = ({ file }: { file: FileObject }) => {
    const { t } = useTranslation('server');
    const onClickRef = useRef<DropdownMenu>(null);
    const [visible, setVisible] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalType | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const { mutate } = useFileManagerSwr();
    const { clearAndAddHttpError, clearFlashes } = useFlash();
    const directory = ServerContext.useStoreState(state => state.files.directory);

    useEventListener(`pterodactyl:files:ctx:${file.key}`, (e: CustomEvent) => {
        if (onClickRef.current) {
            onClickRef.current.triggerMenu(e.detail);
        }
    });

    useEffect(() => {
        if (modal || showConfirmation) {
            setVisible(false);
        }
    }, [modal, showConfirmation]);

    const doDeletion = async () => {
        clearFlashes('files');

        // For UI speed, immediately remove the file from the listing before calling the deletion function.
        // If the delete actually fails, we'll fetch the current directory contents again automatically.
        await mutate(files => files!.filter(f => f.key !== file.key), false);

        deleteFiles(uuid, directory, [file.name]).catch(error => {
            mutate();
            clearAndAddHttpError({ key: 'files', error });
        });
    };

    const doCopy = () => {
        clearFlashes('files');

        copyFile(uuid, join(directory, file.name))
            .then(() => {
                mutate();
                setVisible(false);
            })
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    const doDownload = () => {
        clearFlashes('files');

        getFileDownloadUrl(uuid, join(directory, file.name))
            .then(url => {
                // @ts-expect-error this is valid
                window.location = url;
            })
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    const doArchive = () => {
        clearFlashes('files');

        compressFiles(uuid, directory, [file.name])
            .then(() => {
                mutate();
                setVisible(false);
            })
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    const doUnarchive = () => {
        clearFlashes('files');

        decompressFiles(uuid, directory, file.name)
            .then(() => {
                mutate();
                setVisible(false);
            })
            .catch(error => clearAndAddHttpError({ key: 'files', error }));
    };

    return (
        <>
            {modal ? (
                modal === 'chmod' ? (
                    <ChmodFileModal
                        visible
                        appear
                        files={[{ file: file.name, mode: file.modeBits }]}
                        onDismissed={() => setModal(null)}
                    />
                ) : (
                    <RenameFileModal
                        visible
                        appear
                        files={[file.name]}
                        useMoveTerminology={modal === 'move'}
                        onDismissed={() => setModal(null)}
                    />
                )
            ) : null}
            <Dialog.Confirm
                open={showConfirmation}
                onClose={() => setShowConfirmation(false)}
                title={t('filesPage.deleteConfirm', { type: file.isFile ? (t('filesPage.file') as string) : (t('filesPage.newDirectory') as string) }) as string}
                confirm={t('filesPage.delete') as string}
                onConfirmed={doDeletion}
            >
                <span dangerouslySetInnerHTML={{ __html: t('filesPage.deleteWarning', { name: file.name }) as string }} />
            </Dialog.Confirm>
            <div
                css={tw`absolute top-0 right-0 p-2 hover:text-white text-gray-400 duration-250`}
                onClick={() => setVisible(true)}
            >
                <FontAwesomeIcon icon={faEllipsisH} className={'p-1 bg-black/25 rounded'} />
            </div>
            {visible && (
                <Dialog open={visible} onClose={() => setVisible(false)} title={t('filesPage.fileOptions') as string}>
                    <div className={'grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-4 mt-6'}>
                        <Can action={'file.update'}>
                            <Button.Text onClick={() => setModal('rename')} className={'w-full'}>
                                <PencilIcon className={'w-4 mt-0.5 mr-2'} />
                                {t('filesPage.rename') as string}
                            </Button.Text>
                            <Button.Text onClick={() => setModal('move')} className={'w-full'}>
                                <ArrowUpIcon className={'w-4 mt-0.5 mr-2'} />
                                {t('filesPage.move') as string}
                            </Button.Text>
                            <Button.Text onClick={() => setModal('chmod')} className={'w-full'}>
                                <CogIcon className={'w-4 mt-0.5 mr-2'} />
                                {t('filesPage.permissions') as string}
                            </Button.Text>
                        </Can>
                        {file.isFile && (
                            <Can action={'file.create'}>
                                <Button.Text onClick={doCopy}>
                                    <ClipboardCopyIcon className={'w-4 mt-0.5 mr-2'} />
                                    {t('filesPage.copyFile') as string}
                                </Button.Text>
                            </Can>
                        )}
                        {file.isArchiveType() ? (
                            <Can action={'file.create'}>
                                <Button.Text onClick={doUnarchive}>
                                    <InboxIcon className={'w-4 mt-0.5 mr-2'} />
                                    {t('filesPage.extractFiles') as string}
                                </Button.Text>
                            </Can>
                        ) : (
                            <Can action={'file.archive'}>
                                <Button.Text onClick={doArchive}>
                                    <ArchiveIcon className={'w-4 mt-0.5 mr-2'} />
                                    {t('filesPage.archiveFile') as string}
                                </Button.Text>
                            </Can>
                        )}
                        {file.isFile && (
                            <Button.Text onClick={doDownload}>
                                <DownloadIcon className={'w-4 mt-0.5 mr-2'} />
                                {t('filesPage.download') as string}
                            </Button.Text>
                        )}
                        <Can action={'file.archive'}>
                            <Button.Danger onClick={() => setShowConfirmation(true)}>
                                <TrashIcon className={'w-4 mt-0.5 mr-2'} />
                                {t('filesPage.delete') as string}
                            </Button.Danger>
                        </Can>
                    </div>
                </Dialog>
            )}
        </>
    );
};

export default memo(FileDropdownMenu, isEqual);
