import { Dialog } from '@/elements/dialog';
import { useTranslation } from 'react-i18next';
import { createLink, CustomLink, updateLink, Values } from '@/api/routes/admin/links';
import { VisibleDialog } from './LinksContainer';
import Label from '@/elements/Label';
import InputField from '@/elements/inputs/InputField';
import { Dispatch, FormEvent, SetStateAction, useState } from 'react';
import Switch from '@/elements/Switch';
import { mutate } from 'swr';

export default ({ link, setOpen }: { link?: CustomLink; setOpen: Dispatch<SetStateAction<VisibleDialog>> }) => {
    const { t } = useTranslation('admin');
    const [values, setValues] = useState<Values>({
        name: link?.name ?? '',
        url: link?.url ?? '',
        visible: link?.visible ?? false,
    });

    const onSubmit = () => {
        if (link) {
            updateLink(link.id, values).then(() => {
                setOpen('none');
                mutate(['links']);
            });
        } else {
            createLink(values).then(() => {
                setOpen('none');
                mutate(['links'], true);
            });
        }
    };

    const updateValues = (e: FormEvent<HTMLInputElement>) => {
        setValues(prev => ({ ...prev, [e.currentTarget?.name]: e.currentTarget?.value } as Values));
    };

    return (
        <Dialog.Confirm
            confirm={t('linksModule.create') as string}
            onConfirmed={onSubmit}
            open
            onClose={() => setOpen('none')}
            title={t('linksModule.createNewLink') as string}
        >
            <div className={'mt-4'}>
                <Label>{t('linksModule.linkName') as string}</Label>
                <InputField defaultValue={values.name} name={'name'} onChange={updateValues}></InputField>
                <p className={'text-gray-400 text-sm mt-1'}>{t('linksModule.linkNameDescription') as string}</p>
            </div>
            <div className={'mt-2'}>
                <Label>{t('linksModule.linkUrl') as string}</Label>
                <InputField defaultValue={values.url} name={'url'} onChange={updateValues}></InputField>
                <p className={'text-gray-400 text-sm mt-1'}>
                    {t('linksModule.linkUrlDescription') as string}
                </p>
            </div>
            <div className={'xl:col-span-2 bg-black/50 border border-black shadow-inner p-4 rounded mt-4'}>
                <Switch
                    name={'visible'}
                    defaultChecked={values.visible}
                    onChange={() => {
                        setValues(prev => ({ ...prev, visible: !values.visible }));
                    }}
                    label={t('linksModule.linkVisibility') as string}
                    description={
                        t('linksModule.linkVisibilityDescription') as string
                    }
                />
            </div>
        </Dialog.Confirm>
    );
};
