import {
    Banknote,
    Building2,
    ClipboardList,
    Code,
    Cog,
    Database,
    KeyRound,
    Link,
    Palette,
    Server,
    ShieldAlert,
    Sparkles,
    SquareTerminal,
    Ticket,
    User,
} from '@lucide/svelte';
import { route, type AdminRouteDefinition } from '$lib/router/types';

/**
 * Admin routes, ported from `routers/routes/admin.ts`. Patterns are relative to `/admin`.
 *
 * Every admin page is ported. AdminArea still honours a `legacy: true` route, which
 * reloads the document so Laravel serves the Preact shell for that path (see
 * Admin\BaseController), should a page need to fall back.
 */

const admin: AdminRouteDefinition[] = [
    // --- General
    route<AdminRouteDefinition>('', () => import('./overview/OverviewPage.svelte'), {
        name: '概览',
        end: true,
        icon: Building2,
        category: 'general',
        permission: 'overview.read',
    }),
    route<AdminRouteDefinition>('activity', () => import('./activity/AdminActivityPage.svelte'), {
        name: '活动日志',
        icon: ClipboardList,
        category: 'general',
        permission: 'activity.read',
        condition: flags => flags.activityEnabled,
    }),
    // Core, mode, captcha, webhooks and debug are tabs matched inside SettingsArea.
    route<AdminRouteDefinition>('settings/*', () => import('./settings/SettingsArea.svelte'), {
        name: '设置',
        icon: Cog,
        category: 'general',
        permission: 'settings.read',
    }),
    // Webhooks were their own legacy route gated on `webhooks.read`, so a role holding
    // only that permission keeps access; the more specific pattern wins the match.
    route<AdminRouteDefinition>('settings/webhooks/*', () => import('./settings/SettingsArea.svelte'), {
        permission: 'webhooks.read',
    }),
    route<AdminRouteDefinition>('api/*', () => import('./api/ApiArea.svelte'), {
        name: 'API',
        icon: Code,
        category: 'general',
        advanced: true,
        permission: 'api.read',
    }),

    // --- Modules
    route<AdminRouteDefinition>('auth', () => import('./auth/AuthPage.svelte'), {
        name: '认证',
        icon: KeyRound,
        category: 'modules',
        advanced: true,
        permission: 'auth.read',
    }),
    // Every billing tab, category and product page is matched inside BillingArea.
    route<AdminRouteDefinition>('billing/*', () => import('./billing/BillingArea.svelte'), {
        name: '计费',
        icon: Banknote,
        category: 'modules',
        advanced: true,
        permission: 'billing.read',
    }),
    // List, new, options and :id are matched inside TicketsArea.
    route<AdminRouteDefinition>('tickets/*', () => import('./tickets/TicketsArea.svelte'), {
        name: '工单',
        icon: Ticket,
        category: 'modules',
        advanced: true,
        permission: 'tickets.read',
    }),
    route<AdminRouteDefinition>('ai/*', () => import('./ai/AIArea.svelte'), {
        name: 'AI',
        icon: Sparkles,
        category: 'modules',
        advanced: true,
        permission: 'ai.read',
    }),

    // --- Appearance
    route<AdminRouteDefinition>('theme', () => import('./theme/ThemePage.svelte'), {
        name: '主题',
        icon: Palette,
        category: 'appearance',
        permission: 'theme.read',
    }),
    route<AdminRouteDefinition>('links/*', () => import('./links/LinksPage.svelte'), {
        name: '链接',
        icon: Link,
        category: 'appearance',
        permission: 'links.read',
    }),
    // General and appearance are tabs matched inside AlertsArea.
    route<AdminRouteDefinition>('alerts/*', () => import('./alerts/AlertsArea.svelte'), {
        name: '告警',
        icon: ShieldAlert,
        category: 'appearance',
        permission: 'alerts.read',
    }),

    // --- Management
    route<AdminRouteDefinition>('databases', () => import('./databases/DatabaseHostsPage.svelte'), {
        name: '数据库',
        icon: Database,
        category: 'management',
        advanced: true,
        permission: 'databases.read',
    }),
    route<AdminRouteDefinition>('databases/:id', () => import('./databases/DatabaseHostPage.svelte'), {
        permission: 'databases.read',
    }),
    // List, new and :id tabs are matched inside NodesArea.
    route<AdminRouteDefinition>('nodes/*', () => import('./nodes/NodesArea.svelte'), {
        name: '节点',
        icon: Server,
        category: 'management',
        permission: 'nodes.read',
    }),
    // List, new, :id tabs and the preset pages are matched inside ServersArea. A role holding
    // only server-presets.read reaches the presets through the more specific pattern.
    route<AdminRouteDefinition>('servers/*', () => import('./servers/ServersArea.svelte'), {
        name: '服务器',
        icon: SquareTerminal,
        category: 'management',
        permission: 'servers.read',
    }),
    route<AdminRouteDefinition>('servers/presets/*', () => import('./servers/ServersArea.svelte'), { permission: 'server-presets.read' }),
    // List, new, :id tabs and the roles pages are matched inside UsersArea. A role holding
    // only roles.read reaches the roles pages through the more specific pattern.
    route<AdminRouteDefinition>('users/*', () => import('./users/UsersArea.svelte'), {
        name: '用户',
        icon: User,
        category: 'management',
        permission: 'users.read',
    }),
    route<AdminRouteDefinition>('users/roles/*', () => import('./users/UsersArea.svelte'), { permission: 'roles.read' }),

    // --- Services (no sidebar entry in the legacy table either; reached from the servers tabs).
    // List, :id, :id/new and the egg tabs are matched inside NestsArea.
    route<AdminRouteDefinition>('nests/*', () => import('./nests/NestsArea.svelte'), { permission: 'nests.read' }),
];

export default admin;

export const adminRouteCategories = ['general', 'modules', 'appearance', 'management', 'services'] as const;

export const adminCategoryLabels: Record<(typeof adminRouteCategories)[number], string> = {
    general: '常规',
    modules: '模块',
    appearance: '外观',
    management: '管理',
    services: '服务',
};
