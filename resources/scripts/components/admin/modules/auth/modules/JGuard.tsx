import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useFlash from '@/plugins/useFlash';
import Label from '@/elements/Label';
import Input from '@/elements/Input';
import Select from '@/elements/Select';
import AdminBox from '@/elements/AdminBox';
import Spinner from '@/elements/Spinner';
import { CheckCircleIcon, TrashIcon } from '@heroicons/react/outline';
import { toggleModule, updateModule } from '@/api/routes/admin/auth';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { Dialog } from '@/elements/dialog';
import { faDoorOpen } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from '@/state/hooks';

export default () => {
    const { t } = useTranslation('admin');
    const [confirm, setConfirm] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const delay = useStoreState(state => state.everest.data!.auth.modules.jguard.delay);
    const sensitivity = useStoreState(state => state.everest.data!.auth.modules.jguard.sensitivity);

    const update = async (key: string, value: any) => {
        clearFlashes();
        setLoading(true);
        setSuccess(false);

        updateModule('jguard', key, value)
            .then(() => {
                setSuccess(true);
                setLoading(false);
                setTimeout(() => setSuccess(false), 2000);
            })
            .catch(error => {
                clearAndAddHttpError({ key: 'auth:modules:jguard', error });

                setLoading(false);
            });
    };

    const doDeletion = () => {
        toggleModule('disable', 'jguard')
            .then(() => {
                // @ts-expect-error this is fine
                window.location = '/admin/auth';
            })
            .catch(error => clearAndAddHttpError({ key: 'auth:modules:jguard', error }));
    };

    return (
        <AdminBox title={t('authModule.jGuard') as string} icon={faDoorOpen}>
            <FlashMessageRender byKey={'auth:modules:jguard'} className={'my-2'} />
            {loading && <Spinner className={'absolute top-0 right-8 m-3.5'} size={'small'} />}
            {success && <CheckCircleIcon className={'w-5 h-5 absolute top-0 right-8 m-3.5 text-green-500'} />}
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
                <Label>{t('authModule.automaticApprovalDelay') as string}</Label>
                <Input
                    autoComplete={'off'}
                    id={'delay'}
                    type={'text'}
                    name={'delay'}
                    defaultValue={delay || 0}
                    onChange={e => update('delay', parseInt(e.target.value))}
                />
                <p className={'text-xs text-gray-400 mt-1'}>{t('authModule.jguardDelayDescription') as string}</p>
            </div>
            <div className={'mt-6'}>
                <Label>{t('authModule.altAccountDetectionSensitivity') as string}</Label>
                <Select
                    id={'sensitivity'}
                    name={'sensitivity'}
                    defaultValue={sensitivity || 'medium'}
                    onChange={e => update('sensitivity', e.target.value)}
                    autoComplete={'off'}
                >
                    <option value={'low'}>{t('authModule.sensitivityLow') as string}</option>
                    <option value={'medium'}>{t('authModule.sensitivityMedium') as string}</option>
                    <option value={'high'}>{t('authModule.sensitivityHigh') as string}</option>
                </Select>
                <p className={'text-xs text-gray-400 mt-1'}>{t('authModule.jguardSensitivityDescription') as string}</p>
            </div>
        </AdminBox>
    );
};
