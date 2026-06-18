import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerContext } from '@/state/server';
import Modal from '@/elements/Modal';
import tw from 'twin.macro';
import { Button } from '@/elements/button';
import { saveFileContents } from '@/api/routes/server/files';
import FlashMessageRender from '@/elements/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import { SocketEvent, SocketRequest } from '@server/events';

const EulaModalFeature = () => {
    const { t } = useTranslation('server');
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const status = ServerContext.useStoreState(state => state.status.value);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { connected, instance } = ServerContext.useStoreState(state => state.socket);

    useEffect(() => {
        if (!connected || !instance || status === 'running') return;

        const listener = (line: string) => {
            if (line.toLowerCase().indexOf('you need to agree to the eula in order to run the server') >= 0) {
                setVisible(true);
            }
        };

        instance.addListener(SocketEvent.CONSOLE_OUTPUT, listener);

        return () => {
            instance.removeListener(SocketEvent.CONSOLE_OUTPUT, listener);
        };
    }, [connected, instance, status]);

    const onAcceptEULA = () => {
        setLoading(true);
        clearFlashes('feature:eula');

        saveFileContents(uuid, 'eula.txt', 'eula=true')
            .then(() => {
                if (status === 'offline' && instance) {
                    instance.send(SocketRequest.SET_STATE, 'restart');
                }

                setLoading(false);
                setVisible(false);
            })
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'feature:eula', error });
            })
            .then(() => setLoading(false));
    };

    useEffect(() => {
        clearFlashes('feature:eula');
    }, []);

    return (
        <Modal
            visible={visible}
            onDismissed={() => setVisible(false)}
            closeOnBackground={false}
            showSpinnerOverlay={loading}
        >
            <FlashMessageRender key={'feature:eula'} css={tw`mb-4`} />
            <h2 css={tw`text-2xl mb-4 text-neutral-100`}>{t('featuresPage.acceptEula') as string}</h2>
            <p css={tw`text-neutral-200`}>
                {t('featuresPage.eulaAgreement') as string}
            </p>
            <div css={tw`mt-8 sm:flex items-center justify-end`}>
                <Button onClick={() => setVisible(false)} css={tw`w-full sm:w-auto border-transparent`}>
                    {t('featuresPage.cancel') as string}
                </Button>
                <Button onClick={onAcceptEULA} css={tw`mt-4 sm:mt-0 sm:ml-4 w-full sm:w-auto`}>
                    {t('featuresPage.iAccept') as string}
                </Button>
            </div>
        </Modal>
    );
};

export default EulaModalFeature;
