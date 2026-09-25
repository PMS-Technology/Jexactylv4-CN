import copy from 'copy-to-clipboard';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import Dialog from '@/elements/dialog/Dialog';
import useFlash from '@/plugins/useFlash';
import { ClipboardCopyIcon, ExternalIcon, XIcon } from './icons';

interface Props {
    open: boolean;
    url: string;
    onClose: () => void;
}

export default ({ open, url, onClose }: Props) => {
    const { addFlash } = useFlash();
    const [copied, setCopied] = useState(false);

    const copyLink = () => {
        copy(url);
        setCopied(true);
        addFlash({ key: 'console:share', type: 'success', message: 'Link copied' });
    };

    return (
        <Dialog open={open} onClose={onClose} title={'Share Logs'} hideCloseIcon>
            <div className={'flex items-start justify-between gap-4'}>
                <span className={'text-2xl font-semibold text-neutral-50'}>Share Logs</span>
                <button type={'button'} className={'mc-icon-button !h-9 !w-9'} aria-label={'Close'} onClick={onClose}>
                    <XIcon className={'!h-5 !w-5'} />
                </button>
            </div>
            <div className={'mt-4 flex flex-wrap items-center justify-center gap-4'}>
                <div className={'rounded-xl bg-white p-1'}>
                    <QRCodeSVG value={url || ' '} size={148} />
                </div>
                <div className={'flex w-64 max-w-full flex-col gap-2'}>
                    <button
                        type={'button'}
                        className={'flex h-10 w-full items-center justify-between gap-2 rounded-xl border-0 px-3 text-left'}
                        style={{ background: 'var(--surface-4)', color: 'var(--color-base)' }}
                        onClick={copyLink}
                    >
                        <span className={'min-w-0 truncate font-semibold'}>{copied ? 'Copied' : url}</span>
                        <ClipboardCopyIcon className={'h-5 w-5 shrink-0'} />
                    </button>
                    <a
                        href={url}
                        target={'_blank'}
                        rel={'noopener noreferrer'}
                        className={'flex h-10 w-full items-center justify-center gap-2 rounded-xl no-underline'}
                        style={{ background: 'var(--color-brand)', color: '#000' }}
                    >
                        Open in new tab
                        <ExternalIcon className={'h-5 w-5'} />
                    </a>
                </div>
            </div>
        </Dialog>
    );
};
