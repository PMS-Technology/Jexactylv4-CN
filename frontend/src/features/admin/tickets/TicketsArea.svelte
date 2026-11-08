<script lang="ts">
    import { Cog, Ticket } from '@lucide/svelte';
    import { updateTicketSetting } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import { Button, Card } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import TicketsList from './TicketsList.svelte';
    import NewTicket from './NewTicket.svelte';
    import TicketDetail from './TicketDetail.svelte';
    import TicketOptions from './TicketOptions.svelte';

    /**
     * Ticket dashboard, ported from TicketRouter.tsx and EnableTicketsContainer.tsx. The
     * list, `new`, `options` and `:id` pages are matched here.
     */
    const sub = $derived(router.pathname.replace(/^\/admin\/tickets\/?/, '').replace(/\/+$/, ''));
    const ticketId = $derived(/^\d+$/.test(sub) ? Number(sub) : null);
    const enabled = $derived(Boolean(app.flags?.tickets.enabled));

    let toggling = $state(false);
    let error = $state('');

    async function enable() {
        toggling = true;
        error = '';
        try {
            await updateTicketSetting('enabled', true);
            app.updateFlags({ tickets: { ...app.flags!.tickets, enabled: true } });
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            toggling = false;
        }
    }
</script>

<svelte:head>
    <title>工单 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if !enabled}
        <PageHeader title="工单系统" />
        {#if error}<Alert variant="destructive" class="mb-4">{error}</Alert>{/if}
        <Card class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <Ticket class="size-8 shrink-0 text-primary" />
            <p class="flex-1 text-sm text-muted-foreground">
                工单系统让用户可以在面板上提交支持请求。用户可以创建、更新和查看工单，管理员可以回复并设置状态。此功能可以随时开关。
            </p>
            {#if app.can('tickets.update')}
                <Button loading={toggling} onclick={enable}>启用工单</Button>
            {/if}
        </Card>
    {:else}
        <PageHeader title="工单管理" description="查看、创建和处理用户的支持工单。" />

        <nav class="mb-6 flex gap-1 border-b border-border" aria-label="工单分类">
            {#each [{ path: '', name: '工单列表', icon: Ticket }, { path: 'options', name: '选项', icon: Cog }] as tab (tab.path)}
                {@const Icon = tab.icon}
                <Link
                    href={tab.path ? `/admin/tickets/${tab.path}` : '/admin/tickets'}
                    end={tab.path !== ''}
                    class="-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    activeClass={tab.path || sub !== 'options' ? 'border-primary! text-foreground font-medium' : ''}
                >
                    <Icon class="size-4" />{tab.name}
                </Link>
            {/each}
        </nav>

        {#if sub === ''}
            <TicketsList />
        {:else if sub === 'new'}
            {#if app.can('tickets.create')}
                <NewTicket />
            {:else}
                <p class="text-sm text-destructive">你没有权限创建工单。</p>
            {/if}
        {:else if sub === 'options'}
            <TicketOptions />
        {:else if ticketId !== null}
            {#key ticketId}
                <TicketDetail id={ticketId} />
            {/key}
        {:else}
            <NotFound backTo="/admin/tickets" />
        {/if}
    {/if}
</div>
