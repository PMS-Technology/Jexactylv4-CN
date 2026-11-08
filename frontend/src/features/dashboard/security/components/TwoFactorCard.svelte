<script lang="ts">
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/ui';
    import EnableTwoFactorDialog from './EnableTwoFactorDialog.svelte';
    import DisableTwoFactorDialog from './DisableTwoFactorDialog.svelte';
    import RecoveryTokensDialog from './RecoveryTokensDialog.svelte';

    let enableOpen = $state(false);
    let disableOpen = $state(false);
    let tokens = $state<string[]>([]);
    let tokensOpen = $state(false);

    function onEnabled(recovery: string[]) {
        enableOpen = false;
        tokens = recovery;
        tokensOpen = true;
    }
</script>

<Card>
    <CardHeader>
        <CardTitle>两步验证</CardTitle>
        <CardDescription>
            {app.user?.useTotp
                ? '你的账号已启用两步验证。'
                : '你的账号尚未启用两步验证。启用后，每次登录都需要输入验证器生成的代码。'}
        </CardDescription>
    </CardHeader>
    <CardContent>
        {#if app.user?.useTotp}
            <Button variant="destructive" size="sm" onclick={() => (disableOpen = true)}>停用两步验证</Button>
        {:else}
            <Button size="sm" onclick={() => (enableOpen = true)}>启用两步验证</Button>
        {/if}
    </CardContent>
</Card>

{#if enableOpen}
    <EnableTwoFactorDialog bind:open={enableOpen} {onEnabled} />
{/if}
<DisableTwoFactorDialog bind:open={disableOpen} />
<RecoveryTokensDialog bind:open={tokensOpen} {tokens} />
