import { Form, Formik, FormikHelpers } from 'formik';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';
import { object, string } from 'yup';
import { getRoles, createRole } from '@/api/routes/admin/roles';
import FlashMessageRender from '@/elements/FlashMessageRender';
import { Button } from '@/elements/button';
import Field from '@/elements/Field';
import useFlash from '@/plugins/useFlash';
import { Dialog } from '@/elements/dialog';
import SpinnerOverlay from '@/elements/SpinnerOverlay';

interface Values {
    name: string;
    description: string;
    color: string;
}

export default () => {
    const { t } = useTranslation('admin');
    const [visible, setVisible] = useState(false);
    const { clearFlashes, clearAndAddHttpError } = useFlash();
    const { mutate } = getRoles();

    const submit = ({ name, description, color }: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('role:create');
        setSubmitting(true);

        createRole(name, description, color)
            .then(async role => {
                await mutate(data => ({ ...data!, items: data!.items.concat(role) }), false);
                setVisible(false);
            })
            .catch(error => {
                clearAndAddHttpError({ key: 'role:create', error });
                setSubmitting(false);
            });
    };

    return (
        <>
            <Formik
                onSubmit={submit}
                initialValues={{ name: '', description: '', color: '' }}
                validationSchema={object().shape({
                    name: string()
                        .required(t('users.roleNameRequired') as string)
                        .max(32, t('users.roleNameMaxLength') as string),
                    description: string().max(255, t('users.roleDescriptionMaxLength') as string),
                    color: string().nullable(),
                })}
            >
                {({ isSubmitting, resetForm }) => (
                    <Dialog
                        open={visible}
                        preventExternalClose={isSubmitting}
                        onClose={() => {
                            resetForm();
                            setVisible(false);
                        }}
                    >
                        <SpinnerOverlay visible={isSubmitting} />
                        <FlashMessageRender byKey={'role:create'} css={tw`mb-6`} />
                        <h2 css={tw`mb-6 text-2xl text-neutral-100`}>{t('users.newRole') as string}</h2>
                        <Form css={tw`m-0`}>
                            <Field
                                type={'text'}
                                id={'name'}
                                name={'name'}
                                label={t('users.name') as string}
                                description={t('users.shortNameDescription') as string}
                                autoFocus
                            />

                            <div css={tw`mt-6`}>
                                <Field
                                    type={'text'}
                                    id={'description'}
                                    name={'description'}
                                    label={t('users.description') as string}
                                    description={t('users.roleDescription') as string}
                                />
                            </div>
                            <div css={tw`mt-6`}>
                                <Field
                                    type={'color'}
                                    id={'color'}
                                    name={'color'}
                                    label={t('users.roleColor') as string}
                                    description={t('users.roleColorDescription') as string}
                                />
                            </div>

                            <div css={tw`flex flex-wrap justify-end mt-6`}>
                                <Button
                                    type={'button'}
                                    variant={Button.Variants.Secondary}
                                    css={tw`w-full sm:w-auto sm:mr-2`}
                                    onClick={() => setVisible(false)}
                                >
                                    {t('users.cancel') as string}
                                </Button>
                                <Button css={tw`w-full mt-4 sm:w-auto sm:mt-0`} type={'submit'}>
                                    {t('users.createRole') as string}
                                </Button>
                            </div>
                        </Form>
                    </Dialog>
                )}
            </Formik>

            <Button
                type={'button'}
                size={Button.Sizes.Large}
                css={tw`h-10 px-4 py-0 whitespace-nowrap`}
                onClick={() => setVisible(true)}
            >
                {t('users.newRole') as string}
            </Button>
        </>
    );
};
