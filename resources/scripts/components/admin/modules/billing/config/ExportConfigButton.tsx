import { Button } from '@/elements/button';
import { useTranslation } from 'react-i18next';
import useFlash from '@/plugins/useFlash';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { exportBillingConfiguration } from '@/api/routes/admin/billing';

export default () => {
    const { t } = useTranslation('admin');
    const { clearAndAddHttpError, clearFlashes, addFlash } = useFlash();

    const submit = () => {
        clearFlashes();

        exportBillingConfiguration()
            .then(() => {
                addFlash({
                    key: 'billing:config',
                    type: 'success',
                    message: t('billingModule.billingConfigurationExportedSuccessfully'),
                });
            })
            .catch(error => clearAndAddHttpError({ key: 'billing:config', error }));
    };

    return (
        <>
            <Button onClick={submit}>
                <FontAwesomeIcon icon={faDownload} className={'mr-1'} /> {t('billingModule.export')}
            </Button>
        </>
    );
};
