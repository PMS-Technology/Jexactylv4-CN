import { lazy } from 'react';
import * as Icon from '@heroicons/react/outline';
import { route, type AdminRouteDefinition } from '@/routers/routes/utils';

import ServerPresetContainer from '@/components/admin/management/servers/presets/ServerPresetContainer';
import ServerPresetViewContainer from '@/components/admin/management/servers/presets/ServerPresetViewContainer';
// todo(jex): lazy load these

const OverviewContainer = lazy(() => import('@/components/admin/general/overview/OverviewContainer'));
const SettingsRouter = lazy(() => import('@/components/admin/general/settings/SettingsRouter'));
const ApplicationApiRouter = lazy(() => import('@/components/admin/general/api/ApplicationApiRouter'));

const AuthContainer = lazy(() => import('@/components/admin/modules/auth/AuthContainer'));
const BillingRouter = lazy(() => import('@/components/admin/modules/billing/BillingRouter'));
const TicketRouter = lazy(() => import('@/components/admin/modules/tickets/TicketRouter'));
const AIRouter = lazy(() => import('@/components/admin/modules/ai/AIRouter'));
const WebhookRouter = lazy(() => import('@/components/admin/general/settings/webhooks/WebhookRouter'));
const ThemeContainer = lazy(() => import('@/components/admin/modules/theme/ThemeContainer'));
const AlertRouter = lazy(() => import('@/components/admin/modules/alert/AlertRouter'));

const NodeRouter = lazy(() => import('@/components/admin/management/nodes/NodeRouter'));
const NodesContainer = lazy(() => import('@/components/admin/management/nodes/NodesContainer'));
const NewNodeContainer = lazy(() => import('@/components/admin/management/nodes/NewNodeContainer'));

const DatabaseEditContainer = lazy(() => import('@/components/admin/management/databases/DatabaseEditContainer'));
const DatabasesContainer = lazy(() => import('@/components/admin/management/databases/DatabasesContainer'));

const LinksContainer = lazy(() => import('@/components/admin/modules/links/LinksContainer'));

const ServersContainer = lazy(() => import('@/components/admin/management/servers/ServersContainer'));
const NewServerContainer = lazy(() => import('@/components/admin/management/servers/NewServerContainer'));
const ServerRouter = lazy(() => import('@/components/admin/management/servers/ServerRouter'));

const AdminUsersContainer = lazy(() => import('@/components/admin/management/users/UsersContainer'));
const NewUserContainer = lazy(() => import('@/components/admin/management/users/NewUserContainer'));
const UserRouter = lazy(() => import('@/components/admin/management/users/UserRouter'));
const RolesContainer = lazy(() => import('@/components/admin/management/users/roles/RolesContainer'));
const RoleEditContainer = lazy(() => import('@/components/admin/management/users/roles/RoleEditContainer'));

const NestsContainer = lazy(() => import('@/components/admin/service/nests/NestsContainer'));
const NestEditContainer = lazy(() => import('@/components/admin/service/nests/NestEditContainer'));
const NewEggContainer = lazy(() => import('@/components/admin/service/nests/NewEggContainer'));
const EggRouter = lazy(() => import('@/components/admin/service/nests/eggs/EggRouter'));

const admin: AdminRouteDefinition[] = [
    /**
     * Admin - General Routes
     */
    route('', OverviewContainer, {
        name: 'Overview',
        nameKey: 'nav.overview',
        end: true,
        icon: Icon.OfficeBuildingIcon,
        category: 'general',
    }),
    route('settings/*', SettingsRouter, {
        name: 'Settings',
        nameKey: 'nav.settings',
        icon: Icon.CogIcon,
        category: 'general',
    }),
    route('settings/webhooks/*', WebhookRouter),
    route('api/*', ApplicationApiRouter, {
        name: 'API',
        nameKey: 'nav.api',
        icon: Icon.CodeIcon,
        category: 'general',
        advanced: true,
    }),

    /**
     * Admin - Module Routes
     */
    route('auth', AuthContainer, {
        name: 'Auth',
        nameKey: 'nav.auth',
        icon: Icon.KeyIcon,
        category: 'modules',
        advanced: true,
    }),
    route('billing/*', BillingRouter, {
        name: 'Billing',
        nameKey: 'nav.billing',
        icon: Icon.CashIcon,
        category: 'modules',
        advanced: true,
    }),
    route('tickets/*', TicketRouter, {
        name: 'Tickets',
        nameKey: 'nav.tickets',
        icon: Icon.TicketIcon,
        category: 'modules',
        advanced: true,
    }),
    route('ai/*', AIRouter, { name: 'AI', nameKey: 'nav.ai', icon: Icon.SparklesIcon, category: 'modules', advanced: true }),

    /**
     * Admin - Appearance Routes
     */
    route('theme', ThemeContainer, {
        name: 'Theme',
        nameKey: 'nav.theme',
        icon: Icon.PencilAltIcon,
        category: 'appearance',
    }),
    route('links/*', LinksContainer, { name: 'Links', nameKey: 'nav.links', icon: Icon.LinkIcon, category: 'appearance' }),
    route('alerts/*', AlertRouter, {
        name: 'Alerts',
        nameKey: 'nav.alerts',
        icon: Icon.ShieldExclamationIcon,
        category: 'appearance',
    }),

    /**
     * Admin - Management Routes
     */
    route('databases', DatabasesContainer, {
        name: 'Databases',
        nameKey: 'nav.databases',
        icon: Icon.DatabaseIcon,
        category: 'management',
        advanced: true,
    }),
    route('databases/:id', DatabaseEditContainer),
    route('nodes/*', NodesContainer, { name: 'Nodes', nameKey: 'nav.nodes', icon: Icon.ServerIcon, category: 'management' }),
    route('nodes/new', NewNodeContainer),
    route('nodes/:id/*', NodeRouter),

    route('servers', ServersContainer, {
        name: 'Servers',
        nameKey: 'nav.servers',
        icon: Icon.TerminalIcon,
        category: 'management',
    }),
    route('servers/new', NewServerContainer),
    route('servers/presets', ServerPresetContainer),
    route('servers/presets/:id/*', ServerPresetViewContainer),
    route('servers/:id/*', ServerRouter),

    route('users', AdminUsersContainer, { name: 'Users', nameKey: 'nav.users', icon: Icon.UserIcon, category: 'management' }),
    route('users/new', NewUserContainer),
    route('users/:id/*', UserRouter),
    route('users/roles', RolesContainer),
    route('users/roles/:id', RoleEditContainer),

    /**
     * Admin - Service Routes
     */
    route('nests', NestsContainer),
    route('nests/:nestId', NestEditContainer),
    route('nests/:nestId/new', NewEggContainer),
    route('nests/:nestId/eggs/:id/*', EggRouter),
];

export default admin;
