<script lang="ts">
    import { onMount } from 'svelte';
    import { AlertTriangle } from '@lucide/svelte';
    import { processCheckoutSession } from '$lib/api/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import { Button, Spinner } from '$lib/ui';
    import OutcomeCard from './components/OutcomeCard.svelte';

    /**
     * Stripe's `success_url` (PaymentService) lands here with `?session=…`. The backend
     * claims the order atomically, so a refresh after success gets "already processed"
     * rather than a second deployment.
     */
    let error = $state('');

    onMount(() => {
        const session = router.query.get('session');

        if (!session) {
            navigate('/account/billing/cancel', { replace: true });

            return;
        }

        processCheckoutSession(session)
            // The server page is still served by the legacy bundle, so it needs a document load.
            .then(server => window.location.replace(`/server/${server.id}`))
            .catch(e => {
                // Payment may have gone through even when processing fails, so this must not
                // claim the user was not charged; point them at their orders instead.
                error = httpErrorToHuman(e);
            });
    });
</script>

<svelte:head>
    <title>正在处理订单 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

{#if error}
    <OutcomeCard icon={AlertTriangle} tone="destructive" title="订单处理失败">
        <p>{error}</p>
        <p class="mt-2">如果已经付款，请在订单页面查看状态，或联系管理员处理。</p>
        {#snippet actions()}
            <Button href="/account/billing/orders" size="sm">查看订单</Button>
            {#if app.flags?.tickets.enabled}
                <Button href="/account/tickets" variant="outline" size="sm">提交工单</Button>
            {/if}
        {/snippet}
    </OutcomeCard>
{:else}
    <div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <Spinner size="lg" />
        <div class="space-y-1">
            <h1 class="font-header text-lg font-semibold">正在处理订单</h1>
            <p class="text-sm text-muted-foreground">正在部署你的服务器，请勿关闭此页面。</p>
        </div>
    </div>
{/if}
