<script lang="ts">
    import { XCircle } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { Button } from '$lib/ui';
    import OutcomeCard from './components/OutcomeCard.svelte';
</script>

<svelte:head>
    <title>订单已取消 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<!-- Stripe's `cancel_url`: the user left checkout before paying, so nothing was charged. -->
<OutcomeCard icon={XCircle} tone="muted" title="订单已取消">
    你没有在 Stripe 完成付款，因此不会被扣费。如需重新下单，可以回到套餐列表。
    {#snippet actions()}
        <Button href="/account/billing/order" size="sm">重新下单</Button>
    {/snippet}
</OutcomeCard>
