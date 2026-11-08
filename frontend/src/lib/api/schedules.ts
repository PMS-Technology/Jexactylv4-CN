import http from '$lib/api/http';
import { toSchedule, toTask } from '$lib/api/transformers/server';
import type { Schedule, Task } from '$lib/api/definitions/server';

/**
 * Schedule and task endpoints under `/api/client/servers/:id/schedules`, ported from
 * `api/routes/server/schedules.ts` and `tasks.ts`.
 */

export type ScheduleData = Pick<Schedule, 'cron' | 'name' | 'onlyWhenOnline' | 'isActive'> & { id?: number };

export async function getSchedules(uuid: string): Promise<Schedule[]> {
    const { data } = await http.get(`/api/client/servers/${uuid}/schedules`, {
        params: { include: ['tasks'] },
    });

    return (data.data ?? []).map(toSchedule);
}

export async function getSchedule(uuid: string, schedule: number): Promise<Schedule> {
    const { data } = await http.get(`/api/client/servers/${uuid}/schedules/${schedule}`, {
        params: { include: ['tasks'] },
    });

    return toSchedule(data);
}

/** Creates the schedule, or updates it when `id` is set. */
export async function modifySchedule(uuid: string, schedule: ScheduleData): Promise<Schedule> {
    const { data } = await http.post(`/api/client/servers/${uuid}/schedules${schedule.id ? `/${schedule.id}` : ''}`, {
        is_active: schedule.isActive,
        only_when_online: schedule.onlyWhenOnline,
        name: schedule.name,
        minute: schedule.cron.minute,
        hour: schedule.cron.hour,
        day_of_month: schedule.cron.dayOfMonth,
        month: schedule.cron.month,
        day_of_week: schedule.cron.dayOfWeek,
    });

    return toSchedule(data);
}

export async function triggerSchedule(uuid: string, schedule: number): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/schedules/${schedule}/execute`);
}

export async function deleteSchedule(uuid: string, schedule: number): Promise<void> {
    await http.delete(`/api/client/servers/${uuid}/schedules/${schedule}`);
}

/** Creates the task, or updates it when `task` is set. */
export async function modifyTask(
    uuid: string,
    schedule: number,
    task: number | undefined,
    values: { action: string; payload: string; timeOffset: string | number; continueOnFailure: boolean },
): Promise<Task> {
    const { data } = await http.post(`/api/client/servers/${uuid}/schedules/${schedule}/tasks${task ? `/${task}` : ''}`, {
        action: values.action,
        payload: values.payload,
        continue_on_failure: values.continueOnFailure,
        time_offset: values.timeOffset,
    });

    return toTask(data.attributes);
}

export async function deleteTask(uuid: string, schedule: number, task: number): Promise<void> {
    await http.delete(`/api/client/servers/${uuid}/schedules/${schedule}/tasks/${task}`);
}
