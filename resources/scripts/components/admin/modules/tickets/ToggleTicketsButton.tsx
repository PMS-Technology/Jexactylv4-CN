import { updateTicketSettings } from '@/api/routes/admin/tickets';
import { useStoreState } from '@/state/hooks';
import { useTranslation } from 'react-i18next';
import { Button } from '@/elements/button';
import { useNavigate } from 'react-router-dom';

export default () => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const enabled = useStoreState(state => state.everest.data!.tickets.enabled);

    const submit = () => {
        updateTicketSettings('enabled', !enabled).then(() => navigate(0));
    };

    return (
        <div className={'mr-4'} onClick={submit}>
            {!enabled ? <Button>{t('ticketsModule.enableTickets') as string}</Button> : <Button.Danger>{t('ticketsModule.disableTickets') as string}</Button.Danger>}
        </div>
    );
};
