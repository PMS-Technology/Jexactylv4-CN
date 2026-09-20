import type { FormikHelpers } from 'formik';
import { Form, Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import tw from 'twin.macro';
import { bool, object, string } from 'yup';

import type { UpdateUserValues } from '@/api/routes/admin/users';
import AdminBox from '@/elements/AdminBox';
import CopyOnClick from '@/elements/CopyOnClick';
import FormikSwitch from '@/elements/FormikSwitch';
import Input from '@/elements/Input';
import Label from '@/elements/Label';
import SpinnerOverlay from '@/elements/SpinnerOverlay';
import { Button } from '@/elements/button';
import Field, { FieldRow } from '@/elements/Field';
import { UserRole } from '@definitions/admin';
import { faIdBadge, faToggleOn } from '@fortawesome/free-solid-svg-icons';
import { useStoreState } from '@/state/hooks';
import RoleSelect from './RoleSelect';
import { useEffect, useState } from 'react';
import { getRole } from '@/api/routes/admin/roles';
import { Alert } from '@/elements/alert';

export interface Params {
    title: string;
    initialValues?: UpdateUserValues;
    children?: React.ReactNode;

    onSubmit: (values: UpdateUserValues, helpers: FormikHelpers<UpdateUserValues>) => void;

    uuid?: string;
    admin_role_id?: number | null;
}

export default function UserForm({ title, initialValues, children, onSubmit, uuid, admin_role_id }: Params) {
    const { t } = useTranslation('admin');
    const { colors } = useStoreState(state => state.theme.data!);

    const [currentRole, setCurrentRole] = useState<UserRole | undefined>();

    const submit = (values: UpdateUserValues, helpers: FormikHelpers<UpdateUserValues>) => {
        onSubmit(values, helpers);
    };

    useEffect(() => {
        getRole(Number(admin_role_id))
            .then(setCurrentRole)
            .catch(error => console.log(error));
    }, []);

    if (!initialValues) {
        initialValues = {
            externalId: '',
            username: '',
            email: '',
            password: '',
            admin_role_id: null,
            state: '',
            rootAdmin: false,
        };
    }

    return (
        <Formik
            onSubmit={submit}
            initialValues={initialValues}
            validationSchema={object().shape({
                username: string().min(1).max(32),
                email: string(),
                rootAdmin: bool().required(),
            })}
        >
            {({ isSubmitting, isValid }) => (
                <Form>
                    <AdminBox title={title} css={tw`relative`} icon={faIdBadge}>
                        <SpinnerOverlay visible={isSubmitting} />
                        <FieldRow>
                            {uuid && (
                                <div>
                                    <Label>{t('users.uuid') as string}</Label>
                                    <CopyOnClick text={uuid}>
                                        <Input type={'text'} value={uuid} readOnly />
                                    </CopyOnClick>
                                </div>
                            )}
                            {uuid && (
                                <Field
                                    id={'externalId'}
                                    name={'externalId'}
                                    label={t('users.externalId') as string}
                                    type={'text'}
                                    description={
                                        t('users.externalIdDescription') as string
                                    }
                                />
                            )}
                            <Field
                                id={'username'}
                                name={'username'}
                                label={t('users.username') as string}
                                type={'text'}
                                description={t('users.usernameDescription') as string}
                            />
                            <Field
                                id={'email'}
                                name={'email'}
                                label={t('users.emailAddress') as string}
                                type={'email'}
                                description={t('users.emailDescription') as string}
                            />
                            <Field
                                id={'password'}
                                name={'password'}
                                label={t('users.password') as string}
                                type={'password'}
                                placeholder={'••••••••'}
                                autoComplete={'new-password'}
                                description={
                                    t('users.passwordDescription') as string
                                }
                            />
                        </FieldRow>
                    </AdminBox>
                    <AdminBox title={t('users.permissionControl') as string} css={tw`relative mt-6`} icon={faToggleOn}>
                        <SpinnerOverlay visible={isSubmitting} />
                        <div className={'grid lg:grid-cols-2 gap-4'}>
                            <div css={tw`w-full flex flex-row mb-6`}>
                                <div
                                    css={tw`w-full border border-neutral-900 shadow-inner p-4 rounded`}
                                    style={{ backgroundColor: colors.headers }}
                                >
                                    <FormikSwitch
                                        name={'rootAdmin'}
                                        label={t('users.rootAdmin') as string}
                                        description={t('users.rootAdminDescription') as string}
                                    />
                                    <Alert type={'warning'} className={'mt-2'} small>
                                        {t('users.rootAdminWarning') as string}
                                    </Alert>
                                </div>
                            </div>
                            <div>
                                <RoleSelect selected={currentRole} />
                                <p className={'mt-1 text-xs'}>
                                    {t('users.assignRoleDescription') as string}
                                </p>
                            </div>
                        </div>
                    </AdminBox>
                    <div css={tw`w-full flex flex-row items-center mt-6`}>
                        {children}
                        <div css={tw`flex ml-auto`}>
                            <Button type={'submit'} disabled={isSubmitting || !isValid}>
                                {t('users.saveChanges') as string}
                            </Button>
                        </div>
                    </div>
                </Form>
            )}
        </Formik>
    );
}
