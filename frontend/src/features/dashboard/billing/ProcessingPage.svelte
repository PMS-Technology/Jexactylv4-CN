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
     * Where the customer lands after paying.
     *
     * Stripe sends the checkout session id; the gateways that notify the panel over
     * HTTP send the payment reference instead. The backend claims the order
     * atomically, so a refresh after success gets "already processed" rather than a
     * second deployment.
     *
     * A channel that notifies the panel may not have delivered its notification yet
     * when the customer arrives, so the page keeps asking until the order is done.
     */
    let error = $state('');

    const session = router.query.get('session');
    const reference = router.query.get('reference');

    onMount(() => {
        if (!session && !reference) {
            navigate('/account/billing/cancel', { replace: true });

            return;
        }

        const deadline = Date.now() + 60_000;

        const check = () =>
            processCheckoutSession(reference ?? '', session ?? undefined).then(result => {
                if (result === 'pending') {
                    if (Date.now() > deadline) {
                        // The notification is taking a while. The order is still there,
                        // so the customer can see it on the orders page.
                        navigate('/account/billing/orders', { replace: true });

                        return;
                    }

                    setTimeout(check, 2000);

                    return;
                }

                // The server page is still served by the legacy bundle, so it needs a
                // document load.
                window.location.replace(`/server/${result.id}`);
            });

        check().catch(e => {
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
