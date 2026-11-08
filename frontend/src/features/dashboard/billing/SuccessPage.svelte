<script lang="ts">
    import { CheckCircle2 } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { Button } from '$lib/ui';
    import OutcomeCard from './components/OutcomeCard.svelte';
</script>

<svelte:head>
    <title>订单已完成 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<OutcomeCard icon={CheckCircle2} tone="success" title="订单已完成">
    感谢你的付款，服务器已创建。
    {#snippet actions()}
        <Button href="/" size="sm">返回控制台</Button>
    {/snippet}
</OutcomeCard>
