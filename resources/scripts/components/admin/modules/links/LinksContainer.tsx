import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomLink } from '@/api/routes/admin/links';
import AdminContentBlock from '@/elements/AdminContentBlock';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { Button } from '@/elements/button';
import CreateLinkDialog from './CreateLinkDialog';
import DeleteLinkDialog from './DeleteLinkDialog';
import LinksTable from './LinksTable';

export type VisibleDialog = 'none' | 'create' | 'update' | 'delete';

export default () => {
    const { t } = useTranslation('admin');
    const [link, setLink] = useState<CustomLink | null>(null);
    const [open, setOpen] = useState<VisibleDialog>('none');

    return (
        <AdminContentBlock title={t('linksModule.title') as string}>
            {open === 'create' && <CreateLinkDialog setOpen={setOpen} />}
            {open === 'update' && link && <CreateLinkDialog link={link} setOpen={setOpen} />}
            {open === 'delete' && <DeleteLinkDialog id={link?.id} setOpen={setOpen} />}
            <FlashMessageRender byKey={'admin:links'} className={'mb-4'} />
            <div className={'w-full flex flex-row items-center mb-8'}>
                <div className={'flex flex-col flex-shrink'} style={{ minWidth: '0' }}>
                    <h2 className={'text-2xl text-neutral-50 font-header font-medium'}>{t('linksModule.title') as string}</h2>
                    <p
                        className={
                            'hidden lg:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden'
                        }
                    >
                        {t('linksModule.description') as string}
                    </p>
                </div>
                <div className={'flex ml-auto pl-4'}>
                    <Button onClick={() => setOpen('create')}>{t('linksModule.newLink') as string}</Button>
                </div>
            </div>
            <LinksTable setLink={setLink} setOpen={setOpen} />
        </AdminContentBlock>
    );
};
