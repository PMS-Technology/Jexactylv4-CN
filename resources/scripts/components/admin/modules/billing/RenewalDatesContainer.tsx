import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import { useStoreActions, useStoreState } from '@/state/hooks';
import { faCalendar, faClock } from '@fortawesome/free-solid-svg-icons';
import Label from '@/elements/Label';
import Input from '@/elements/Input';
import { updateSettings } from '@/api/routes/admin/billing';
import FlashMessageRender from '@/elements/FlashMessageRender';
import useFlash from '@/plugins/useFlash';

export default () => {
    const { t } = useTranslation('admin');
    const [loading, setLoading] = useState(false);
    const { clearFlashes, addFlash } = useFlash();

    const settings = useStoreState(s => s.everest.data!.billing);
    const updateEverest = useStoreActions(s => s.everest.updateEverest);

    const [days, setDays] = useState<number>(settings.renewal.days);
    const [threshold, setThreshold] = useState<number>(settings.renewal.threshold);

    const handleSaveAll = async () => {
        clearFlashes('admin:billing');
        setLoading(true);

        try {
            await updateSettings('renewal:days', days);
            await updateSettings('renewal:threshold', threshold);

            updateEverest({
                billing: {
                    ...settings,
                    renewal: {
                        ...settings.renewal,
                        days: days,
                        threshold: threshold,
                    },
                },
            });

            addFlash({
                key: 'admin:billing',
                type: 'success',
                message: t('billingModule.renewalSettingsUpdated'),
            });
        } catch (error) {
            console.error(error);
            addFlash({
                key: 'admin:billing',
                type: 'error',
                message: t('billingModule.renewalSettingsFailed'),
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <FlashMessageRender byKey={'admin:billing'} className={'mb-4'} />

            <div className={'grid lg:grid-cols-2 gap-4'}>
                <AdminBox title={t('billingModule.renewalDaysAddition') as string} icon={faCalendar}>
                    <p className={'text-gray-400 mb-4'}>
                        {t('billingModule.renewalDaysDescription') as string}
                    </p>
                    <div>
                        <Label>{t('billingModule.days') as string}</Label>
                        <Input
                            type={'number'}
                            min={1}
                            max={365}
                            value={days}
                            onChange={e => setDays(parseInt(e.target.value))}
                            disabled={loading}
                        />
                        <p className={'text-xs text-gray-500 mt-2'}>
                            {t('billingModule.renewalDaysHelp') as string}
                        </p>
                    </div>
                </AdminBox>

                <AdminBox title={t('billingModule.deletionThreshold') as string} icon={faClock}>
                    <p className={'text-gray-400 mb-4'}>
                        {t('billingModule.deletionThresholdDescription') as string}
                    </p>
                    <div>
                        <Label>{t('billingModule.days') as string}</Label>
                        <Input
                            type={'number'}
                            min={0}
                            max={90}
                            value={threshold}
                            onChange={e => setThreshold(parseInt(e.target.value))}
                            disabled={loading}
                        />
                        <p className={'text-xs text-gray-500 mt-2'}>
                            {t('billingModule.deletionThresholdHelp') as string}
                        </p>
                    </div>
                </AdminBox>
            </div>

            <div className={'flex justify-end mt-6'}>
                <Button onClick={handleSaveAll} disabled={loading}>
                    {loading ? (t('billingModule.saving') as string) : (t('billingModule.saveAllSettings') as string)}
                </Button>
            </div>
        </div>
    );
};
