import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Schedule } from '@definitions/server';
import Field from '@/elements/Field';
import { Form, Formik, FormikHelpers } from 'formik';
import FormikSwitch from '@/elements/FormikSwitch';
import { modifySchedule } from '@/api/routes/server/schedules';
import { ServerContext } from '@/state/server';
import { httpErrorToHuman } from '@/api/http';
import FlashMessageRender from '@/elements/FlashMessageRender';
import useFlash from '@/plugins/useFlash';
import tw from 'twin.macro';
import { Button } from '@/elements/button/index';
import ModalContext from '@/elements/ModalContext';
import asModal from '@/hoc/asModal';
import Switch from '@/elements/Switch';
import ScheduleCheatsheetCards from '@server/schedules/ScheduleCheatsheetCards';
import { useStoreState } from '@/state/hooks';

interface Props {
    schedule?: Schedule;
}

interface Values {
    name: string;
    dayOfWeek: string;
    month: string;
    dayOfMonth: string;
    hour: string;
    minute: string;
    enabled: boolean;
    onlyWhenOnline: boolean;
}

const EditScheduleModal = ({ schedule }: Props) => {
    const { t } = useTranslation('server');
    const { addError, clearFlashes } = useFlash();
    const { dismiss } = useContext(ModalContext);

    const { colors } = useStoreState(state => state.theme.data!);
    const uuid = ServerContext.useStoreState(state => state.server.data!.uuid);
    const appendSchedule = ServerContext.useStoreActions(actions => actions.schedules.appendSchedule);
    const [showCheatsheet, setShowCheetsheet] = useState(false);

    useEffect(() => {
        return () => {
            clearFlashes('schedule:edit');
        };
    }, []);

    const submit = (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
        clearFlashes('schedule:edit');
        modifySchedule(uuid, {
            id: schedule?.id,
            name: values.name,
            cron: {
                minute: values.minute,
                hour: values.hour,
                dayOfWeek: values.dayOfWeek,
                month: values.month,
                dayOfMonth: values.dayOfMonth,
            },
            onlyWhenOnline: values.onlyWhenOnline,
            isActive: values.enabled,
        })
            .then(schedule => {
                setSubmitting(false);
                appendSchedule(schedule);
                dismiss();
            })
            .catch(error => {
                console.error(error);

                setSubmitting(false);
                addError({ key: 'schedule:edit', message: httpErrorToHuman(error) });
            });
    };

    return (
        <Formik
            onSubmit={submit}
            initialValues={
                {
                    name: schedule?.name || '',
                    minute: schedule?.cron.minute || '*/5',
                    hour: schedule?.cron.hour || '*',
                    dayOfMonth: schedule?.cron.dayOfMonth || '*',
                    month: schedule?.cron.month || '*',
                    dayOfWeek: schedule?.cron.dayOfWeek || '*',
                    enabled: schedule?.isActive ?? true,
                    onlyWhenOnline: schedule?.onlyWhenOnline ?? true,
                } as Values
            }
        >
            {({ isSubmitting }) => (
                <Form>
                    <h3 css={tw`text-2xl mb-6`}>{schedule ? (t('schedulesPage.editSchedule') as string) : (t('schedulesPage.createNewSchedule') as string)}</h3>
                    <FlashMessageRender byKey={'schedule:edit'} css={tw`mb-6`} />
                    <Field
                        name={'name'}
                        label={t('schedulesPage.scheduleName') as string}
                        description={t('schedulesPage.scheduleNameDesc') as string}
                    />
                    <div css={tw`grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6`}>
                        <Field name={'minute'} label={t('schedulesPage.minute') as string} />
                        <Field name={'hour'} label={t('schedulesPage.hour') as string} />
                        <Field name={'dayOfMonth'} label={t('schedulesPage.dayOfMonth') as string} />
                        <Field name={'month'} label={t('schedulesPage.month') as string} />
                        <Field name={'dayOfWeek'} label={t('schedulesPage.dayOfWeek') as string} />
                    </div>
                    <p css={tw`text-neutral-400 text-xs mt-2`}>
                        {t('schedulesPage.cronDescription') as string}
                    </p>
                    <div
                        css={tw`mt-6 border-2 border-black/25 shadow-inner p-4 rounded`}
                        style={{ backgroundColor: colors.secondary }}
                    >
                        <Switch
                            name={'show_cheatsheet'}
                            description={t('schedulesPage.showCheatsheetDesc') as string}
                            label={t('schedulesPage.showCheatsheet') as string}
                            defaultChecked={showCheatsheet}
                            onChange={() => setShowCheetsheet(s => !s)}
                        />
                        {showCheatsheet && (
                            <div css={tw`block md:flex w-full`}>
                                <ScheduleCheatsheetCards />
                            </div>
                        )}
                    </div>
                    <div
                        css={tw`mt-6 border-2 border-black/25 shadow-inner p-4 rounded`}
                        style={{ backgroundColor: colors.secondary }}
                    >
                        <FormikSwitch
                            name={'onlyWhenOnline'}
                            description={t('schedulesPage.onlyWhenOnlineDesc') as string}
                            label={t('schedulesPage.onlyWhenOnline') as string}
                        />
                    </div>
                    <div
                        css={tw`mt-6 border-2 border-black/25 shadow-inner p-4 rounded`}
                        style={{ backgroundColor: colors.secondary }}
                    >
                        <FormikSwitch
                            name={'enabled'}
                            description={t('schedulesPage.scheduleEnabledDesc') as string}
                            label={t('schedulesPage.scheduleEnabled') as string}
                        />
                    </div>
                    <div css={tw`mt-6 text-right`}>
                        <Button className={'w-full sm:w-auto'} type={'submit'} disabled={isSubmitting}>
                            {schedule ? (t('schedulesPage.saveChanges') as string) : (t('schedulesPage.createSchedule') as string)}
                        </Button>
                    </div>
                </Form>
            )}
        </Formik>
    );
};

export default asModal<Props>()(EditScheduleModal);
