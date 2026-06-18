import tw from 'twin.macro';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import { faUserSlash } from '@fortawesome/free-solid-svg-icons';
import { Dialog } from '@/elements/dialog';
import { useState } from 'react';
import useFlash from '@/plugins/useFlash';
import { Context } from '@admin/management/users/UserRouter';
import { deleteUser } from '@/api/routes/admin/users';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default () => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const { clearAndAddHttpError } = useFlash();
    const [visible, setVisible] = useState<boolean>(false);
    const user = Context.useStoreState(state => state.user!.id);

    const submit = () => {
        deleteUser(user)
            .then(() => {
                navigate('/admin/users');
            })
            .catch(error => {
                clearAndAddHttpError({ key: 'user:manage', error });
            });

        setVisible(false);
    };

    return (
        <>
            <Dialog.Confirm
                title={t('users.confirmDeletionRequest') as string}
                onConfirmed={submit}
                open={visible}
                onClose={() => setVisible(false)}
                confirm={t('users.iUnderstandProceed') as string}
            >
                {t('users.deleteUserConfirmation') as string}
            </Dialog.Confirm>
            <div css={tw`h-auto flex flex-col`}>
                <AdminBox icon={faUserSlash} title={t('users.deleteUser') as string} css={tw`relative w-full`}>
                    <Button.Danger size={Button.Sizes.Large} css={tw`w-full`} onClick={() => setVisible(true)}>
                        {t('users.deleteUser') as string}
                    </Button.Danger>
                    <p css={tw`text-xs text-neutral-400 mt-2`}>
                        {t('users.deleteUserDescription') as string}
                    </p>
                </AdminBox>
            </div>
        </>
    );
};
