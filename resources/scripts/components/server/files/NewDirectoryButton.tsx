import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerContext } from '@/state/server';
import { Form, Formik, FormikHelpers } from 'formik';
import Field from '@/elements/Field';
import { join } from 'pathe';
import { object, string } from 'yup';
import { createDirectory } from '@/api/routes/server/directories';
import tw from 'twin.macro';
import { Button } from '@/elements/button/index';
import { useFlashKey } from '@/plugins/useFlash';
import useFileManagerSwr from '@/plugins/useFileManagerSwr';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { Dialog, DialogWrapperContext } from '@/elements/dialog';
import Code from '@/elements/Code';
import asDialog from '@/hoc/asDialog';
import { FileObject } from '@definitions/server';

interface Values {
    directoryName: string;
}

const generateDirectoryData = (name: string): FileObject => ({
    key: `dir_${name.split('/', 1)[0] ?? name}`,
    name: name.replace(/^(\/*)/, '').split('/', 1)[0] ?? name,
    mode: 'drwxr-xr-x',
    modeBits: '0755',
    size: 0,
    isFile: false,
    isSymlink: false,
    mimetype: '',
    createdAt: new Date(),
    modifiedAt: new Date(),
    isArchiveType: () => false,
    isEditable: () => false,
});

const NewDirectoryDialog = asDialog({
    title: '',
})(() => {
    const { t } = useTranslation('server');
    const { setProps } = useContext(DialogWrapperContext);
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const directory = ServerContext.useStoreState(state => state.files.directory);

    const { mutate } = useFileManagerSwr();
    const { close } = useContext(DialogWrapperContext);
    const { clearAndAddHttpError } = useFlashKey('files:directory-modal');

    const schema = object().shape({
        directoryName: string().required(t('filesPage.validDirectoryRequired') as string),
    });

    useEffect(() => {
        setProps(state => ({
            ...state,
            title: t('filesPage.createDirectory'),
        }));

        return () => {
            clearAndAddHttpError();
        };
    }, [setProps, t]);

    const submit = ({ directoryName }: Values, { setSubmitting }: FormikHelpers<Values>) => {
        createDirectory(uuid, directory, directoryName)
            .then(() => mutate(data => [...data!, generateDirectoryData(directoryName)], false))
            .then(() => close())
            .catch(error => {
                setSubmitting(false);
                clearAndAddHttpError(error);
            });
    };

    return (
        <Formik onSubmit={submit} validationSchema={schema} initialValues={{ directoryName: '' }}>
            {({ submitForm, values }) => (
                <>
                    <FlashMessageRender key={'files:directory-modal'} />
                    <Form css={tw`m-0`}>
                        <Field autoFocus id={'directoryName'} name={'directoryName'} label={t('filesPage.directoryName') as string} />
                        <p css={tw`mt-2 text-sm md:text-base break-all`}>
                            <span css={tw`text-neutral-200`}>{t('filesPage.directoryWillBe') as string}</span>
                            <Code>
                                /home/container/
                                <span css={tw`text-cyan-200`}>
                                    {join(directory, values.directoryName).replace(/^(\.\.\/|\/)+/, '')}
                                </span>
                            </Code>
                        </p>
                    </Form>
                    <Dialog.Footer>
                        <Button.Text className={'w-full sm:w-auto'} onClick={close}>
                            {t('filesPage.cancel') as string}
                        </Button.Text>
                        <Button className={'w-full sm:w-auto'} onClick={submitForm}>
                            {t('filesPage.create') as string}
                        </Button>
                    </Dialog.Footer>
                </>
            )}
        </Formik>
    );
});

export default ({ className }: { className?: string }) => {
    const { t } = useTranslation('server');
    const [open, setOpen] = useState(false);

    return (
        <>
            <NewDirectoryDialog open={open} onClose={setOpen.bind(this, false)} />
            <Button.Text onClick={setOpen.bind(this, true)} className={className}>
                {t('filesPage.createDirectory') as string}
            </Button.Text>
        </>
    );
};
