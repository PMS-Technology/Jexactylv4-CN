import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from '@/state/hooks';
import Label from '@/elements/Label';
import Input from '@/elements/Input';
import AdminBox from '@/elements/AdminBox';
import { TrashIcon } from '@heroicons/react/outline';
import { Dialog } from '@/elements/dialog';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import RequiredFieldIcon from '@/elements/RequiredFieldIcon';
import useStatus from '@/plugins/useStatus';
import { toggleModule, updateModule } from '@/api/routes/admin/auth/module';
import { Alert } from '@/elements/alert';

export default () => {
    const { t } = useTranslation('admin');
    const { status, setStatus } = useStatus();
    const [confirm, setConfirm] = useState<boolean>(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { colors } = useStoreState(state => state.theme.data!);
    const settings = useStoreState(state => state.everest.data!.auth.modules.discord);

    const update = async (key: string, value: any) => {
        clearFlashes();
        setStatus('loading');

        updateModule('discord', key, value)
            .then(() => {
                setStatus('success');
                setTimeout(() => setStatus('none'), 2000);
            })
            .catch(error => {
                clearAndAddHttpError({ key: 'auth:modules:discord', error });

                setStatus('none');
            });
    };

    const doDeletion = () => {
        toggleModule('disable', 'discord')
            .then(() => {
                // @ts-expect-error this is fine
                window.location = '/admin/auth';
            })
            .catch(error => clearAndAddHttpError({ key: 'auth:modules:discord', error }));
    };

    return (
        <AdminBox
            title={t('authModule.discordSSOModule') as string}
            icon={faDiscord}
            byKey={'auth:modules:discord'}
            status={status}
            canDelete
        >
            <Dialog.Confirm
                open={confirm}
                title={t('authModule.confirmModuleRemoval') as string}
                onConfirmed={() => doDeletion()}
                onClose={() => setConfirm(false)}
            >
                {t('authModule.confirmModuleDeletion') as string}
            </Dialog.Confirm>
            <TrashIcon
                className={'w-5 h-5 absolute top-0 right-0 m-3.5 text-red-500 hover:text-red-300 duration-300'}
                onClick={() => setConfirm(true)}
            />
            <div>
                <Label>{t('authModule.clientIdentifier') as string} {!settings.clientId && <RequiredFieldIcon />}</Label>
                <Input
                    autoComplete={'off'}
                    id={'client_id'}
                    type={'password'}
                    name={'client_id'}
                    onChange={e => update('client_id', e.target.value)}
                    placeholder={settings.clientId ? '••••••••••••••••' : ''}
                />
                <p className={'text-xs text-gray-400 mt-1'}>
                    {t('authModule.discordClientIdDescription') as string}{' '}
                    <Link
                        to={'https://discord.com/developers/docs/intro'}
                        style={{ color: colors.primary }}
                        className={'hover:brightness-125 duration-300'}
                    >
                        {t('authModule.developerPortal') as string}
                    </Link>
                    .
                </p>
            </div>
            <div className={'my-6'}>
                <Label>{t('authModule.clientSecret') as string} {!settings.clientSecret && <RequiredFieldIcon />}</Label>
                <Input
                    autoComplete={'off'}
                    id={'client_secret'}
                    type={'password'}
                    name={'client_secret'}
                    onChange={e => update('client_secret', e.target.value)}
                    placeholder={settings.clientSecret ? '••••••••••••••••' : ''}
                />
                <p className={'text-xs text-gray-400 mt-1'}>
                    {t('authModule.discordClientSecretDescription') as string}{' '}
                    <Link
                        to={'https://discord.com/developers/docs/intro'}
                        style={{ color: colors.primary }}
                        className={'hover:brightness-125 duration-300'}
                    >
                        {t('authModule.developerPortal') as string}
                    </Link>
                    .
                </p>
            </div>
            <Alert type={'info'}>
                <div>
                    {t('authModule.useFollowingCallbackUrl') as string}
                    <p className={'bg-black/50 p-1 rounded-lg font-mono w-fit mt-2'}>
                        /auth/modules/discord/authenticate
                    </p>
                </div>
            </Alert>
        </AdminBox>
    );
};
