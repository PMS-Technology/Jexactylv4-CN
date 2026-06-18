import { Dialog } from '@/elements/dialog';
import { useTranslation } from 'react-i18next';
import { VisibleDialog } from './LinksContainer';
import { deleteLink } from '@/api/routes/admin/links';
import { Dispatch, SetStateAction } from 'react';
import Spinner from '@/elements/Spinner';
import { mutate } from 'swr';

export default ({ id, setOpen }: { id?: number; setOpen: Dispatch<SetStateAction<VisibleDialog>> }) => {
    const { t } = useTranslation('admin');
    if (!id) return <Spinner centered />;

    const onSubmit = () => {
        deleteLink(id).then(() => {
            setOpen('none');
            mutate(['links']);
        });
    };

    return (
        <Dialog.Confirm
            confirm={t('linksModule.delete') as string}
            onConfirmed={onSubmit}
            open
            onClose={() => setOpen('none')}
            title={t('linksModule.deleteCustomLink') as string}
        >
            <div className={'mt-2'}>
                {t('linksModule.deleteCustomLinkConfirmation') as string}
            </div>
        </Dialog.Confirm>
    );
};
