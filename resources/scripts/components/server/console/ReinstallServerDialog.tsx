import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerContext } from '@/state/server';
import { reinstallServer } from '@/api/routes/server';
import { Actions, useStoreActions } from 'easy-peasy';
import { ApplicationStore } from '@/state';
import { httpErrorToHuman } from '@/api/http';
import tw from 'twin.macro';
import { Button } from '@/elements/button/index';
import { Dialog } from '@/elements/dialog';

export default () => {
    const { t } = useTranslation('server');
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const [modalVisible, setModalVisible] = useState(false);
    const { addFlash, clearFlashes } = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes);

    const reinstall = () => {
        clearFlashes('settings');
        reinstallServer(uuid)
            .then(() => {
                addFlash({
                    key: 'settings',
                    type: 'success',
                    message: t('consolePage.reinstallStarted') as string,
                });
            })
            .catch(error => {
                console.error(error);

                addFlash({ key: 'settings', type: 'error', message: httpErrorToHuman(error) });
            })
            .then(() => setModalVisible(false));
    };

    useEffect(() => {
        clearFlashes();
    }, []);

    return (
        <>
            <Dialog.Confirm
                open={modalVisible}
                title={t('consolePage.confirmReinstall') as string}
                confirm={t('consolePage.reinstallYes') as string}
                onClose={() => setModalVisible(false)}
                onConfirmed={reinstall}
            >
                <div css={tw`text-sm rounded-lg p-4 bg-yellow-500/25 mb-4`} dangerouslySetInnerHTML={{ __html: t('consolePage.reinstallWarning') as string }} />
                {t('consolePage.reinstallConfirm') as string}
            </Dialog.Confirm>
            <Button.Danger type={'button'} variant={Button.Variants.Secondary} onClick={() => setModalVisible(true)}>
                {t('consolePage.reinstallServer') as string}
            </Button.Danger>
        </>
    );
};
