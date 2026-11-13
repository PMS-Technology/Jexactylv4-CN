<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { CreditCard } from '@lucide/svelte';
    import { getPaymentChannels } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import ChannelCard from './ChannelCard.svelte';

    /**
     * The payment channels the panel can collect money through.
     *
     * Several channels can be set up at the same time. Which of them a purchase goes
     * through is decided by the payment method the customer picked, so a channel is
     * only useful once a payment method points at it.
     */
    const queryClient = useQueryClient();

    const channels = createQuery(() => ({
        queryKey: ['admin', 'billing', 'channels'],
        queryFn: getPaymentChannels,
    }));

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'billing', 'channels'] });
</script>

<svelte:head>
    <title>支付渠道 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="space-y-6">
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2"><CreditCard class="size-4" />支付渠道</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm text-muted-foreground">
            <p>
                在这里填写各个收款渠道的凭证。可以同时配置多个渠道，用户下单时选择的支付方式决定走哪一个渠道。
            </p>
            <p>
                使用易支付、Creem、Waffo 或 Pancake 时，需要先把商品关联到对方平台的商品编号，
                否则结账时会被拒绝。
            </p>
        </CardContent>
    </Card>

    {#if channels.error}
        <Alert variant="destructive">{httpErrorToHuman(channels.error)}</Alert>
    {:else if !channels.data}
        <Spinner centered />
    {:else}
        <div class="grid gap-4">
            {#each channels.data.channels as channel (channel.id)}
                <ChannelCard {channel} onSaved={refresh} />
            {/each}
        </div>
    {/if}
</div>
