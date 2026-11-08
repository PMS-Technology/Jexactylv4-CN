import { ClipboardList, Receipt, ShieldCheck, Ticket, User } from '@lucide/svelte';
import { redirect, route, type RouteDefinition } from '$lib/router/types';

/**
 * Account routes, ported from `routers/routes/account.ts`.
 *
 * The sidebar and the router both read this list, and `condition` gates entries on the
 * feature flags the backend injects — tickets and billing are optional modules.
 *
 * Migration status: every legacy account route is implemented here against the live
 * API; see MIGRATION_PLAN.md for the running checklist.
 */
const account: RouteDefinition[] = [
    route('', () => import('./pages/AccountOverview.svelte'), {
        name: '账号',
        end: true,
        icon: User,
    }),

    route('security/*', () => import('./security/SecurityPage.svelte'), {
        name: '安全',
        icon: ShieldCheck,
    }),

    // No `end`, so the sidebar entry stays active on a ticket's page; `tickets/:id` is more
    // specific and still wins the match there.
    route('tickets', () => import('./tickets/TicketsPage.svelte'), {
        name: '工单',
        icon: Ticket,
        condition: flags => flags.tickets.enabled,
    }),
    route('tickets/:id', () => import('./tickets/TicketPage.svelte'), {
        condition: flags => flags.tickets.enabled,
    }),

    // Billing. Only the two entry points carry the feature flag in the legacy table; the
    // rest are reached from them or from Stripe's redirects. Every billing API returns
    // 403 when the module is off, so the unflagged pages fail safely either way.
    route('billing/order', () => import('./billing/ProductsPage.svelte'), {
        name: '订购服务',
        end: true,
        icon: Receipt,
        condition: flags => flags.billing.enabled,
    }),
    route('billing/order/:id', () => import('./billing/OrderPage.svelte'), {
        condition: flags => flags.billing.enabled,
    }),
    route('billing/orders', () => import('./billing/OrdersPage.svelte'), {
        name: '订单',
        icon: ClipboardList,
        condition: flags => flags.billing.enabled,
    }),
    route('billing/processing', () => import('./billing/ProcessingPage.svelte')),
    route('billing/success', () => import('./billing/SuccessPage.svelte')),
    route('billing/cancel', () => import('./billing/CancelPage.svelte')),

    // These pages became tabs under Security; the redirects keep existing bookmarks working.
    redirect('api', '/account/security/api'),
    redirect('ssh', '/account/security/ssh'),
    redirect('passkeys', '/account/security/passkeys'),
];

export default account;
