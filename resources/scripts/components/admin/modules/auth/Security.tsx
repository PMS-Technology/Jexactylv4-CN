import Label from '@/elements/Label';
import { useTranslation } from 'react-i18next';
import Select from '@/elements/Select';
import AdminBox from '@/elements/AdminBox';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import Input from '@/elements/Input';
import useFlash from '@/plugins/useFlash';
import { useStoreState } from '@/state/hooks';
import useStatus from '@/plugins/useStatus';
import { updateModule } from '@/api/routes/admin/auth';

export default () => {
    const { t } = useTranslation('admin');
    const { status, setStatus } = useStatus();
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const settings = useStoreState(state => state.everest.data!.auth.security);

    const update = async (key: string, value: any) => {
        clearFlashes();
        setStatus('loading');

        updateModule('security', key, value)
            .then(() => setStatus('success'))
            .catch(error => {
                setStatus('error');
                clearAndAddHttpError({ key: 'auth:security', error });
            });
    };

    return (
        <AdminBox title={t('authModule.securityModule') as string} icon={faLock} byKey={'auth:security'} status={status}>
            <div>
                <Label>{t('authModule.forceTwoFactorAuth') as string}</Label>
                <Select
                    id={'force2fa'}
                    name={'force2fa'}
                    onChange={e => update('force2fa', e.target.value)}
                    autoComplete={'off'}
                >
                    <option value={1} selected={settings.force2fa}>
                        {t('authModule.enabled') as string}
                    </option>
                    <option value={0} selected={!settings.force2fa}>
                        {t('authModule.disabled') as string}
                    </option>
                </Select>
                <p className={'text-xs text-gray-400 mt-1'}>{t('authModule.forceTwoFactorDescription') as string}</p>
            </div>
            <div className={'mt-6'}>
                <Label>{t('authModule.loginAttemptLimit') as string}</Label>
                <Input
                    placeholder={`${settings.attempts ?? 3}`}
                    id={'attempts'}
                    type={'number'}
                    name={'attempts'}
                    autoComplete={'off'}
                    onChange={e => update('attempts', e.target.value)}
                />
                <p className={'text-xs text-gray-400 mt-1'}>
                    {t('authModule.loginAttemptLimitDescription') as string}
                </p>
            </div>
        </AdminBox>
    );
};
