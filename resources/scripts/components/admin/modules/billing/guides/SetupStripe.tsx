import Input from '@/elements/Input';
import { useStoreState } from '@/state/hooks';
import { Dialog } from '@/elements/dialog';
import { faExclamationTriangle, faCheckCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Tooltip from '@/elements/tooltip/Tooltip';
import { useEffect, useState } from 'react';
import { Button } from '@/elements/button';
import { updateSettings } from '@/api/routes/admin/billing';
import { Trans, useTranslation } from 'react-i18next';

interface StripeKeys {
    secret?: string;
}

export default ({ extOpen }: { extOpen?: boolean }) => {
    const { t } = useTranslation('admin');
    const [data, setData] = useState<StripeKeys>();
    const [open, setOpen] = useState<boolean>(extOpen ?? false);
    const existingKeys = useStoreState(s => s.everest.data!.billing.keys);

    const submit = async () => {
        if (!data || !data.secret) return;

        updateSettings('keys:secret', data.secret).then(() => {
            window.location.reload();
        });
    };

    useEffect(() => {
        if (existingKeys && !existingKeys.secret) {
            setOpen(true);
        }
    }, [existingKeys]);

    return (
        <Dialog open={open} onClose={() => setOpen(false)} title={t('billingModule.configureStripeApi')}>
            <div className={'p-3 bg-black/50 rounded-lg mb-4'}>
                <p className={'text-gray-200 font-semibold'}>
                    <FontAwesomeIcon icon={faInfoCircle} className={'text-blue-400 mr-2'} />
                    {t('billingModule.stillSettingUp')}
                </p>
                <p className={'text-gray-400 text-sm'}>{t('billingModule.feelFreeToSkipThisMessage')}</p>
            </div>
            <Trans
                i18nKey={'billingModule.stripeApiKeyInstructions'}
                ns={'admin'}
                components={{
                    dashboard: (
                        <a
                            target={'_blank'}
                            rel={'noreferrer'}
                            className={'text-blue-300 mx-1'}
                            href={'https://dashboard.stripe.com/apikeys'}
                        />
                    ),
                }}
            />
            <div className={'relative mt-4'}>
                <Input
                    placeholder={t('billingModule.enterSecretKey')}
                    onChange={e => setData({ ...data, secret: e.currentTarget.value })}
                />
                {!data?.secret || data.secret.length < 100 || data.secret.length > 120 ? (
                    <Tooltip placement={'right'} content={t('billingModule.youMustEnterValidStripeSecretKey')}>
                        <FontAwesomeIcon
                            icon={faExclamationTriangle}
                            className={'absolute top-1/3 right-4 text-yellow-500'}
                        />
                    </Tooltip>
                ) : (
                    <FontAwesomeIcon icon={faCheckCircle} className={'absolute top-1/3 right-4 text-green-500'} />
                )}
            </div>
            <div className={'w-full text-right mt-4'}>
                <Button onClick={submit} disabled={!data?.secret}>
                    {t('billingModule.submit')}
                </Button>
            </div>
        </Dialog>
    );
};
