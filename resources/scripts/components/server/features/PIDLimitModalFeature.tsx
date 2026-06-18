import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerContext } from '@/state/server';
import Modal from '@/elements/Modal';
import tw from 'twin.macro';
import { Button } from '@/elements/button';
import FlashMessageRender from '@/elements/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { SocketEvent } from '@server/events';
import { useStoreState } from 'easy-peasy';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const PIDLimitModalFeature = () => {
    const { t } = useTranslation('server');
    const [visible, setVisible] = useState(false);
    const [loading] = useState(false);

    const status = ServerContext.useStoreState(state => state.status.value);
    const { clearFlashes } = useFlash();
    const { connected, instance } = ServerContext.useStoreState(state => state.socket);
    const isAdmin = useStoreState(state => state.user.data!.rootAdmin);

    useEffect(() => {
        if (!connected || !instance || status === 'running') return;

        const errors = [
            'pthread_create failed',
            'failed to create thread',
            'unable to create thread',
            'unable to create native thread',
            'unable to create new native thread',
            'exception in thread "craft async scheduler management thread"',
        ];

        const listener = (line: string) => {
            if (errors.some(p => line.toLowerCase().includes(p))) {
                setVisible(true);
            }
        };

        instance.addListener(SocketEvent.CONSOLE_OUTPUT, listener);

        return () => {
            instance.removeListener(SocketEvent.CONSOLE_OUTPUT, listener);
        };
    }, [connected, instance, status]);

    useEffect(() => {
        clearFlashes('feature:pidLimit');
    }, []);

    return (
        <Modal
            visible={visible}
            onDismissed={() => setVisible(false)}
            closeOnBackground={false}
            showSpinnerOverlay={loading}
        >
            <FlashMessageRender key={'feature:pidLimit'} css={tw`mb-4`} />
            {isAdmin ? (
                <>
                    <div css={tw`mt-4 sm:flex items-center`}>
                        <FontAwesomeIcon css={tw`pr-4`} icon={faExclamationTriangle} color={'orange'} size={'4x'} />
                        <h2 css={tw`text-2xl mb-4 text-neutral-100 `}>{t('featuresPage.memoryOrProcessLimit') as string}</h2>
                    </div>
                    <p css={tw`mt-4`}>{t('featuresPage.memoryOrProcessLimitDesc') as string}</p>
                    <p css={tw`mt-4`} dangerouslySetInnerHTML={{ __html: t('featuresPage.pidLimitFix') as string }} />
                    <p css={tw`mt-4`}>
                        <b>{t('featuresPage.pidLimitNote') as string}</b>
                    </p>
                    <div css={tw`mt-8 sm:flex items-center justify-end`}>
                        <Button onClick={() => setVisible(false)} css={tw`w-full sm:w-auto border-transparent`}>
                            {t('featuresPage.close') as string}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div css={tw`mt-4 sm:flex items-center`}>
                        <FontAwesomeIcon css={tw`pr-4`} icon={faExclamationTriangle} color={'orange'} size={'4x'} />
                        <h2 css={tw`text-2xl mb-4 text-neutral-100`}>{t('featuresPage.possibleResourceLimit') as string}</h2>
                    </div>
                    <p css={tw`mt-4`}>
                        {t('featuresPage.possibleResourceLimitDesc') as string}
                    </p>
                    <p css={tw`mt-4`}>
                        <code css={tw`font-mono bg-neutral-900`}>
                            {t('featuresPage.pthreadFailed') as string}
                        </code>
                    </p>
                    <div css={tw`mt-8 sm:flex items-center justify-end`}>
                        <Button onClick={() => setVisible(false)} css={tw`w-full sm:w-auto border-transparent`}>
                            {t('featuresPage.close') as string}
                        </Button>
                    </div>
                </>
            )}
        </Modal>
    );
};

export default PIDLimitModalFeature;
