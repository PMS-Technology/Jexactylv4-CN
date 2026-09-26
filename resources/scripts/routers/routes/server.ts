import { lazy } from 'react';
import * as Icon from '@heroicons/react/outline';
import { route, type ServerRouteDefinition } from '@/routers/routes/utils';

const ServerConsoleContainer = lazy(() => import('@server/console/ServerConsoleContainer'));
const FileManagerContainer = lazy(() => import('@server/files/FileManagerContainer'));
const FileEditContainer = lazy(() => import('@server/files/FileEditContainer'));
const DatabasesContainer = lazy(() => import('@server/databases/DatabasesContainer'));
const ScheduleContainer = lazy(() => import('@server/schedules/ScheduleContainer'));
const ScheduleEditContainer = lazy(() => import('@server/schedules/ScheduleEditContainer'));
const UsersContainer = lazy(() => import('@server/users/UsersContainer'));
const BackupContainer = lazy(() => import('@server/backups/BackupContainer'));
const NetworkContainer = lazy(() => import('@server/network/NetworkContainer'));
const StartupContainer = lazy(() => import('@server/startup/StartupContainer'));
const ServerActivityLogContainer = lazy(() => import('@server/ServerActivityLogContainer'));
const ServerBillingContainer = lazy(() => import('@server/billing/ServerBillingContainer'));
const UpgradeContainer = lazy(() => import('@server/billing/UpgradeContainer'));

const server: ServerRouteDefinition[] = [
    route('', ServerConsoleContainer, {
        permission: 'control.console',
        name: 'Console',
        nameKey: 'console',
        end: true,
        icon: Icon.TerminalIcon,
        fill: true,
    }),
    route('files/*', FileManagerContainer, {
        permission: 'file.*',
        name: 'Files',
        nameKey: 'files',
        icon: Icon.FolderOpenIcon,
        category: 'data',
    }),
    route('files/:action/*', FileEditContainer, { permission: 'file.*' }),
    route('databases/*', DatabasesContainer, {
        permission: 'database.*',
        name: 'Databases',
        nameKey: 'databases',
        icon: Icon.DatabaseIcon,
        category: 'data',
    }),
    route('schedules/*', ScheduleContainer, {
        permission: 'schedule.*',
        name: 'Schedules',
        nameKey: 'schedules',
        icon: Icon.ClockIcon,
        category: 'configuration',
    }),
    route('schedules/:id/*', ScheduleEditContainer, { permission: 'schedule.*', category: 'configuration' }),
    route('users/*', UsersContainer, {
        permission: 'user.*',
        name: 'Users',
        nameKey: 'users',
        icon: Icon.UsersIcon,
        category: 'configuration',
    }),
    route('backups/*', BackupContainer, {
        permission: 'backup.*',
        name: 'Backups',
        nameKey: 'backups',
        icon: Icon.ArchiveIcon,
        category: 'data',
    }),
    route('network/*', NetworkContainer, {
        permission: 'allocation.*',
        name: 'Network',
        nameKey: 'network',
        icon: Icon.WifiIcon,
        category: 'configuration',
    }),
    route('startup/*', StartupContainer, {
        permission: 'startup.*',
        name: 'Startup',
        nameKey: 'startup',
        icon: Icon.PlayIcon,
        category: 'configuration',
    }),
    route('activity/*', ServerActivityLogContainer, {
        permission: 'activity.*',
        name: 'Activity',
        nameKey: 'activity',
        icon: Icon.EyeIcon,
        condition: flags => flags.activityEnabled,
    }),
    route('billing', ServerBillingContainer, {
        permission: 'billing.*',
        name: 'Billing',
        nameKey: 'billing',
        icon: Icon.CashIcon,
        condition: flags => flags.billable,
    }),
    route('billing/upgrade', UpgradeContainer, { condition: flags => flags.billable }),
];

export default server;
