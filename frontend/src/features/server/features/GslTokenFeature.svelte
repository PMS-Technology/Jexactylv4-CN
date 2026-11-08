<script lang="ts">
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { SocketEvent, SocketRequest } from '$lib/api/definitions/events';
    import { updateStartupVariable } from '$lib/api/startup';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { lineMatches } from './index';

    /** Expired Steam GSL token prompt, ported from GSLTokenModalFeature.tsx. */
    let { store }: { store: ServerStore } = $props();

    let open = $state(false);
    let token = $state('');
    let loading = $state(false);
    let error = $state('');

    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => {
        if (store.status === 'running') return;

        if (lineMatches(line, ['(gsl token expired)', '(account not found)'])) {
            error = '';
            open = true;
        }
    });

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!store.server || loading) return;

        loading = true;
        error = '';
        try {
            // An empty value removes the token, as the dialog text says.
            await updateStartupVariable(store.server.uuid, 'STEAM_ACC', token.trim());
            store.instance?.send(SocketRequest.SET_STATE, 'restart');
            token = '';
            open = false;
        } catch (e) {
            console.error(e);
            error = httpErrorToHuman(e);
        } finally {
            loading = false;
        }
    }
</script>

<Dialog bind:open title="GSL 令牌无效" preventClose={loading}>
    <form id="gsl-token-form" class="space-y-4 text-sm" onsubmit={submit}>
        {#if error}
            <Alert variant="destructive">{error}</Alert>
        {/if}
        <p class="text-muted-foreground">你的游戏服务器登录令牌（GSL Token）似乎无效或已过期。</p>
        <p class="text-muted-foreground">你可以生成新令牌填入下方，或留空以完全移除令牌。</p>
        <div class="space-y-1.5">
            <Label for="gsl-token">GSL 令牌</Label>
            <!-- svelte-ignore a11y_autofocus -->
            <Input id="gsl-token" bind:value={token} disabled={loading} autofocus />
            <p class="text-xs text-muted-foreground">
                前往
                <a
                    href="https://steamcommunity.com/dev/managegameservers"
                    target="_blank"
                    rel="noreferrer noopener"
                    class="underline underline-offset-4">steamcommunity.com/dev/managegameservers</a
                >
                生成令牌。
            </p>
        </div>
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={loading} onclick={() => (open = false)}>取消</Button>
        <Button type="submit" form="gsl-token-form" size="sm" {loading}>更新 GSL 令牌</Button>
    {/snippet}
</Dialog>
