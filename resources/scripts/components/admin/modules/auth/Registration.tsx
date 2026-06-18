import useFlash from '@/plugins/useFlash';
import { useTranslation } from 'react-i18next';
import Label from '@/elements/Label';
import Select from '@/elements/Select';
import AdminBox from '@/elements/AdminBox';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from '@/state/hooks';
import { Alert } from '@/elements/alert';
import useStatus from '@/plugins/useStatus';
import { updateModule } from '@/api/routes/admin/auth/module';

export default () => {
    const { t } = useTranslation('admin');
    const { status, setStatus } = useStatus();
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const settings = useStoreState(state => state.everest.data!.auth.registration);

    const update = async (key: string, value: any) => {
        clearFlashes();
        setStatus('loading');

        updateModule('registration', key, value)
            .then(() => {
                setStatus('success');
            })
            .catch(error => {
                setStatus('error');
                clearAndAddHttpError({ key: 'auth:registration', error });
            });
    };

    return (
        <AdminBox title={t('authModule.registrationModule') as string} icon={faUserPlus} byKey={'auth:registration'} status={status}>
            <div>
                <Label>{t('authModule.allowUserRegistration') as string}</Label>
                <Select
                    id={'enabled'}
                    name={'enabled'}
                    onChange={e => update('enabled', e.target.value)}
                    autoComplete={'off'}
                >
                    <option value={1} selected={settings.enabled}>
                        {t('authModule.enabled') as string}
                    </option>
                    <option value={0} selected={!settings.enabled}>
                        {t('authModule.disabled') as string}
                    </option>
                </Select>
                <p className={'text-xs text-gray-400 mt-1'}>
                    {t('authModule.registrationToggleDescription') as string}
                </p>
            </div>
            {!settings.enabled && (
                <Alert type={'warning'} className={'mt-6'}>
                    <span className={'text-xs'}>
                        {t('authModule.registrationDisabledWarning') as string}
                    </span>
                </Alert>
            )}
        </AdminBox>
    );
};
