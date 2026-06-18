import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { Button } from '@/elements/button/index';
import Can from '@/elements/Can';
import { ServerContext } from '@/state/server';
import { PowerAction } from '@server/console/ServerConsoleContainer';
import { Dialog } from '@/elements/dialog';
import { PlayIcon, StopIcon, BanIcon, RefreshIcon } from '@heroicons/react/outline';
import SaveButton from '@server/console/SaveButton';

interface PowerButtonProps {
    className?: string;
}

export default ({ className }: PowerButtonProps) => {
    const { t } = useTranslation('server');
    const [open, setOpen] = useState(false);
    const status = ServerContext.useStoreState(state => state.status.value);
    const instance = ServerContext.useStoreState(state => state.socket.instance);

    const killable = status === 'stopping';
    const onButtonClick = (
        action: PowerAction | 'kill-confirmed',
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ): void => {
        e.preventDefault();
        if (action === 'kill') {
            return setOpen(true);
        }

        if (instance) {
            setOpen(false);
            instance.send('set state', action === 'kill-confirmed' ? 'kill' : action);
        }
    };

    useEffect(() => {
        if (status === 'offline') {
            setOpen(false);
        }
    }, [status]);

    return (
        <div className={className}>
            <Dialog.Confirm
                open={open}
                hideCloseIcon
                onClose={() => setOpen(false)}
                title={t('consolePage.forciblyStop') as string}
                confirm={t('consolePage.continue') as string}
                onConfirmed={onButtonClick.bind(this, 'kill-confirmed')}
            >
                {t('consolePage.forciblyStopWarning') as string}
            </Dialog.Confirm>
            <SaveButton />
            <Can action={'control.start'}>
                <Button.Success disabled={status !== 'offline'} onClick={onButtonClick.bind(this, 'start')}>
                    <PlayIcon className={'w-5 mr-1'} /> {t('consolePage.start') as string}
                </Button.Success>
            </Can>
            <Can action={'control.restart'}>
                <Button.Dark disabled={!status} onClick={onButtonClick.bind(this, 'restart')}>
                    <RefreshIcon className={'w-5 mr-1'} /> {t('consolePage.restart') as string}
                </Button.Dark>
            </Can>
            <Can action={'control.stop'}>
                <Button.Danger
                    disabled={status === 'offline'}
                    onClick={onButtonClick.bind(this, killable ? 'kill' : 'stop')}
                >
                    {killable ? (
                        <>
                            <BanIcon className={'w-5 mr-1'} /> {t('consolePage.kill') as string}
                        </>
                    ) : (
                        <>
                            <StopIcon className={'w-5 mr-1'} /> {t('consolePage.stop') as string}
                        </>
                    )}
                </Button.Danger>
            </Can>
        </div>
    );
};
