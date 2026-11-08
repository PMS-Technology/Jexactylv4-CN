import { Archive, Banknote, Clock, Database, Eye, FolderOpen, Play, Terminal, Users, Wifi } from '@lucide/svelte';
import { route, type ServerRouteDefinition } from '$lib/router/types';

/**
 * Server routes, ported from `routers/routes/server.ts`. Patterns are relative to
 * `/server/:id`; `category` drives the sidebar grouping and `permission` is checked
 * against the subuser permissions from GET /api/client/servers/:id.
 *
 * Migration status: every legacy server route is implemented. The sidebar and router
 * both read this table; `condition` receives the per-server `ServerRouteFlags`.
 */
const server: ServerRouteDefinition[] = [
    route('', () => import('./console/ConsolePage.svelte'), {
        permission: 'control.console',
        name: '控制台',
        end: true,
        icon: Terminal,
    }),
    route('files/*', () => import('./files/FilesArea.svelte'), {
        permission: 'file.*',
        name: '文件管理',
        icon: FolderOpen,
        category: 'data',
    }),
    route('databases/*', () => import('./databases/DatabasesPage.svelte'), {
        permission: 'database.*',
        name: '数据库',
        icon: Database,
        category: 'data',
    }),
    // One outer entry; the list and the `:id` detail page are matched inside SchedulesArea.
    route('schedules/*', () => import('./schedules/SchedulesArea.svelte'), {
        permission: 'schedule.*',
        name: '计划任务',
        icon: Clock,
        category: 'configuration',
    }),
    route('users/*', () => import('./users/UsersPage.svelte'), {
        permission: 'user.*',
        name: '子用户',
        icon: Users,
        category: 'configuration',
    }),
    route('backups/*', () => import('./backups/BackupsPage.svelte'), {
        permission: 'backup.*',
        name: '备份',
        icon: Archive,
        category: 'data',
    }),
    route('network/*', () => import('./network/NetworkPage.svelte'), {
        permission: 'allocation.*',
        name: '网络',
        icon: Wifi,
        category: 'configuration',
    }),
    route('startup/*', () => import('./startup/StartupPage.svelte'), {
        permission: 'startup.*',
        name: '启动参数',
        icon: Play,
        category: 'configuration',
    }),
    route('activity/*', () => import('./activity/ActivityPage.svelte'), {
        permission: 'activity.*',
        name: '活动日志',
        icon: Eye,
        condition: flags => flags.activityEnabled,
    }),
    route('billing', () => import('./billing/ServerBillingPage.svelte'), {
        permission: 'billing.*',
        name: '计费',
        icon: Banknote,
        condition: flags => flags.billable,
    }),
    // The legacy entry carried no permission; the upgrade API itself only checks access
    // to the server, so this is ported as-is.
    route('billing/upgrade', () => import('./billing/UpgradePage.svelte'), {
        condition: flags => flags.billable,
    }),
];

export default server;

/** Sidebar sections, in the legacy order: uncategorised first, then these. */
export const serverRouteCategories = ['data', 'configuration'] as const;

export const categoryLabels: Record<(typeof serverRouteCategories)[number], string> = {
    data: '数据',
    configuration: '配置',
};
