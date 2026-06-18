import type { Actions } from 'easy-peasy';
import { useStoreActions } from 'easy-peasy';
import { useNavigate } from 'react-router-dom';
import type { ApplicationStore } from '@/state';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/elements/dialog';
import { useState } from 'react';
import { Button } from '@/elements/button';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { deleteTicket } from '@/api/routes/admin/tickets';

export default ({ ticketId }: { ticketId: number }) => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();
    const [open, setOpen] = useState<boolean>(false);

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(
        (actions: Actions<ApplicationStore>) => actions.flashes,
    );

    if (!ticketId) return <></>;

    const submit = () => {
        clearFlashes('tickets:view');

        deleteTicket(ticketId)
            .then(() => navigate(`/admin/tickets`))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'tickets:view', error });
            });
    };

    return (
        <>
            <Button.Danger onClick={() => setOpen(true)} className={'mr-3'} type={'button'}>
                {t('ticketsModule.deleteTicket') as string}
            </Button.Danger>
            <Dialog.Confirm
                open={open}
                onConfirmed={submit}
                onClose={() => setOpen(false)}
                title={t('ticketsModule.confirmTicketDeletion') as string}
            >
                <FlashMessageRender byKey={'tickets:view'} />
                {t('ticketsModule.deleteTicketConfirmation') as string}
            </Dialog.Confirm>
        </>
    );
};
