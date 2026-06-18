import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdminBox from '@/elements/AdminBox';
import { Button } from '@/elements/button';
import ToggleFeatureButton from './ToggleFeatureButton';
import { faArrowsUpDown, faDollar, faExchange, faGavel, faKey, faPowerOff } from '@fortawesome/free-solid-svg-icons';
import { useStoreActions, useStoreState } from '@/state/hooks';
import Label from '@/elements/Label';
import Select from '@/elements/Select';
import currencyDictionary from '@/assets/currency';
import SetupStripe from './guides/SetupStripe';
import ExportConfigButton from './config/ExportConfigButton';
import FlashMessageRender from '@/elements/FlashMessageRender';
import ImportConfigButton from './config/ImportConfigButton';
import { deleteStripeKeys, updateSettings } from '@/api/routes/admin/billing';
import BillingLinksForm from '@admin/modules/billing/BillingLinksForm';

export type BillingSetupDialog = 'setup' | 'none';

export default () => {
    const { t } = useTranslation('admin');
    const settings = useStoreState(s => s.everest.data!.billing);
    const updateEverest = useStoreActions(s => s.everest.updateEverest);
    const [open, setOpen] = useState<BillingSetupDialog>('none');

    const submit = async (key: string, value: boolean | string) => {
        await updateSettings(key, value).then(() => {
            updateEverest({ billing: { ...settings, [key]: value } });
        });
    };

    const handleCurrencyChange = async (event: any) => {
        const code: string = event.target.value.toUpperCase();
        const symbol: string = currencyDictionary[code]!.symbol;

        submit('currency:code', code).then(() => {
            submit('currency:symbol', symbol);
        });
    };

    const onDeleteKeys = () => {
        deleteStripeKeys()
            .then(() => window.location.reload())
            .catch(error => console.log(error));
    };

    return (
        <div className={'grid lg:grid-cols-3 gap-4'}>
            {open === 'setup' && <SetupStripe extOpen />}
            <AdminBox title={t('billingModule.primaryCurrency') as string} icon={faDollar}>
                {t('billingModule.choosePrimaryCurrency')}
                <div className={'mt-4'}>
                    <Label>{t('billingModule.currencyCodeName')}</Label>
                    <Select onChange={handleCurrencyChange}>
                        {Object.keys(currencyDictionary).map(code => (
                            <option
                                key={code}
                                value={code}
                                onChange={() => console.log('hello')}
                                selected={code === settings.currency.code.toUpperCase()}
                            >
                                {code} - {currencyDictionary[code]!.name}
                            </option>
                        ))}
                    </Select>
                </div>
            </AdminBox>
            <AdminBox title={t('billingModule.allowSelfUpgrades') as string} icon={faArrowsUpDown}>
                <p className={'text-sm'}>
                    {t('billingModule.allowSelfUpgradesDescription')}
                </p>
                <p className={'text-gray-400 mt-2'}>
                    {t('billingModule.thisServiceIsCurrently')}&nbsp;
                    <span className={settings.allow_upgrades ? 'text-green-500' : 'text-red-500'}>
                        {settings.allow_upgrades ? t('billingModule.enabled') : t('billingModule.disabled')}
                    </span>
                    .
                </p>
                <div className={'text-right mt-2'}>
                    <Button.Text onClick={() => submit('allow_upgrades', !settings.allow_upgrades)}>
                        {settings.allow_upgrades ? t('billingModule.disable') : t('billingModule.enable')}
                    </Button.Text>
                </div>
            </AdminBox>
            <AdminBox title={t('billingModule.importExportConfiguration') as string} icon={faExchange}>
                <FlashMessageRender byKey={'billing:config'} className={'mb-2'} />
                {t('billingModule.importExportDescription')}
                <div className={'text-right mt-3'}>
                    <ExportConfigButton />
                    <ImportConfigButton />
                </div>
            </AdminBox>
            {!settings.keys.secret ? (
                <AdminBox title={t('billingModule.inputStripeApiKeys') as string} icon={faKey}>
                    {t('billingModule.inputStripeApiKeysDescription')}
                    <div className={'text-right mt-3'}>
                        <Button onClick={() => setOpen('setup')}>{t('billingModule.addApiKeys')}</Button>
                    </div>
                </AdminBox>
            ) : (
                <AdminBox title={t('billingModule.resetStripeApiKeys') as string} icon={faKey}>
                    {t('billingModule.resetStripeApiKeysDescription')}
                    <div className={'text-right mt-3'}>
                        <Button.Danger onClick={onDeleteKeys}>{t('billingModule.yesDeleteApiKeys')}</Button.Danger>
                    </div>
                </AdminBox>
            )}
            <AdminBox title={t('billingModule.legalDocumentLinks') as string} icon={faGavel}>
                {t('billingModule.legalDocumentLinksDescription')}
                <BillingLinksForm />
            </AdminBox>
            <AdminBox title={t('billingModule.disableBillingModule') as string} icon={faPowerOff}>
                {t('billingModule.disableBillingModuleDescription')}
                <div className={'text-right mt-3'}>
                    <ToggleFeatureButton />
                </div>
            </AdminBox>
        </div>
    );
};
