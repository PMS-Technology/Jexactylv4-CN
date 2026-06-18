import type { Actions } from 'easy-peasy';
import { useStoreActions } from 'easy-peasy';
import type { FormikHelpers } from 'formik';
import { useTranslation } from 'react-i18next';
import { Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import Field, { FieldRow } from '@/elements/Field';
import tw from 'twin.macro';
import AdminContentBlock from '@/elements/AdminContentBlock';
import { Button } from '@/elements/button';
import FlashMessageRender from '@/elements/FlashMessageRender';
import type { ApplicationStore } from '@/state';
import AdminBox from '@/elements/AdminBox';
import { object, string, number } from 'yup';
import { faTicket } from '@fortawesome/free-solid-svg-icons';
import UserSelect from './UserSelect';
import { useStoreState } from '@/state/hooks';
import Select from '@/elements/Select';
import Label from '@/elements/Label';
import { createTicket } from '@/api/routes/admin/tickets';
import { Values } from '@/api/routes/admin/tickets/types';

const initialValues: Values = {
    title: '',
    user_id: 0,
    assigned_to: null,
    status: 'pending',
};

export default () => {
    const { t } = useTranslation('admin');
    const navigate = useNavigate();

    const { clearFlashes, clearAndAddHttpError } = useStoreActions(
        (actions: Actions<ApplicationStore>) => actions.flashes,
    );
    const { secondary } = useStoreState(state => state.theme.data!.colors);

    const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('ticket:create');

        createTicket(values)
            .then(ticket => navigate(`/admin/tickets/${ticket.id}`))
            .catch(error => {
                console.error(error);
                clearAndAddHttpError({ key: 'ticket:create', error });
            })
            .then(() => setSubmitting(false));
    };

    return (
        <AdminContentBlock title={t('ticketsModule.newTicket') as string}>
            <div css={tw`w-full flex flex-row items-center mb-8`}>
                <div css={tw`flex flex-col flex-shrink`} style={{ minWidth: '0' }}>
                    <h2 css={tw`text-2xl text-neutral-50 font-header font-medium`}>{t('ticketsModule.newTicket') as string}</h2>
                    <p
                        css={tw`hidden md:block text-base text-neutral-400 whitespace-nowrap overflow-ellipsis overflow-hidden`}
                    >
                        {t('ticketsModule.newTicketDescription') as string}
                    </p>
                </div>
            </div>

            <FlashMessageRender byKey={'ticket:create'} />

            <Formik
                onSubmit={submit}
                initialValues={initialValues}
                validationSchema={object().shape({
                    title: string().required().max(191).min(3),
                    user_id: number().required(),
                    assigned_to: number().nullable(),
                    status: string().nullable(),
                })}
            >
                {({ isSubmitting, isValid }) => (
                    <Form>
                        <div css={tw`flex flex-col lg:flex-row`}>
                            <div css={tw`w-full flex flex-col mr-0 lg:mr-2`}>
                                <AdminBox title={t('ticketsModule.ticketDetails') as string} icon={faTicket}>
                                    <FieldRow>
                                        <Field
                                            id={'title'}
                                            name={'title'}
                                            type={'text'}
                                            label={t('ticketsModule.title') as string}
                                            description={t('ticketsModule.titleDescription') as string}
                                        />
                                        <div>
                                            <UserSelect />
                                            <p className={'text-xs pt-2'}>
                                                {t('ticketsModule.userDescription') as string}
                                            </p>
                                        </div>
                                        <div>
                                            <UserSelect isAdmin />
                                            <p className={'text-xs pt-2'}>
                                                {t('ticketsModule.adminDescription') as string}
                                            </p>
                                        </div>
                                        <div>
                                            <Label>{t('ticketsModule.selectTicketStatus') as string}</Label>
                                            <Select id={'status'} name={'status'}>
                                                <option value={'pending'}>{t('ticketsModule.pending') as string}</option>
                                                <option value={'in-progress'}>{t('ticketsModule.inProgress') as string}</option>
                                                <option value={'resolved'}>{t('ticketsModule.resolved') as string}</option>
                                                <option value={'unresolved'}>{t('ticketsModule.unresolved') as string}</option>
                                            </Select>
                                            <p className={'text-xs pt-2'}>
                                                {t('ticketsModule.statusDescription') as string}
                                            </p>
                                        </div>
                                    </FieldRow>
                                </AdminBox>
                                <div css={tw`rounded shadow-md mt-4 py-2 pr-6`} style={{ backgroundColor: secondary }}>
                                    <div css={tw`flex flex-row`}>
                                        <Button type={'submit'} css={tw`ml-auto`} disabled={isSubmitting || !isValid}>
                                            {t('ticketsModule.create') as string}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Form>
                )}
            </Formik>
        </AdminContentBlock>
    );
};
