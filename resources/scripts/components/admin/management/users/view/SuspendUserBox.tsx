import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from '@/elements/dialog';
import { useState } from 'react';
import useFlash from '@/plugins/useFlash';
import { Context } from '@admin/management/users/UserRouter';
import { suspendUser } from '@/api/routes/admin/users';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    const { addFlash, clearAndAddHttpError } = useFlash();
    const [visible, setVisible] = useState<boolean>(false);
    const user = Context.useStoreState(state => state.user);

    const action = user?.state === 'suspended' ? 'unsuspend' : 'suspend';

    const submit = () => {
        suspendUser(user!.id)
            .then(() => {
                addFlash({
                    key: 'user:manage',
                    type: 'success',
                    message: 'This user has been suspended.',
                });
            })
            .catch(error => {
                clearAndAddHttpError({
                    key: 'user:manage',
                    error: error,
                });
            });

        setVisible(false);
    };

    return (
        <>
            <Dialog.Confirm
                title={t('users.confirmActionRequest', { action }) as string}
                onConfirmed={submit}
                open={visible}
                onClose={() => setVisible(false)}
                confirm={t('users.iUnderstandProceed') as string}
            >
                {t('users.confirmSuspendAction', { action }) as string}
            </Dialog.Confirm>
            <div css={tw`h-auto flex flex-col`}>
                <AdminBox
                    icon={action === 'suspend' ? faEyeSlash : faEye}
                    title={t('users.actionUser', { action }) as string}
                    css={tw`relative w-full`}
                >
                    <Button.Warn size={Button.Sizes.Large} css={tw`w-full capitalize`} onClick={() => setVisible(true)}>
                        {t('users.actionUserButton', { action }) as string}
                    </Button.Warn>
                    <p css={tw`text-xs text-neutral-400 mt-2`}>
                        {t('users.suspendUserDescription', {
                            action,
                            state: user?.state === 'suspended' ? t('users.suspended') as string : t('users.active') as string,
                        }) as string}
                    </p>
                </AdminBox>
            </div>
        </>
    );
};
