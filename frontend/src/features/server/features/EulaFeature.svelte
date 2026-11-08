<script lang="ts">
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { SocketEvent, SocketRequest } from '$lib/api/definitions/events';
    import { saveFileContents } from '$lib/api/files';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { lineMatches } from './index';

    /** Minecraft EULA prompt, ported from EulaModalFeature.tsx. */
    let { store }: { store: ServerStore } = $props();

    let open = $state(false);
    let loading = $state(false);
    let error = $state('');

    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => {
        if (store.status === 'running') return;

        if (lineMatches(line, ['you need to agree to the eula in order to run the server'])) {
            error = '';
            open = true;
        }
    });

    async function accept() {
        if (!store.server || loading) return;

        loading = true;
        error = '';
        try {
            await saveFileContents(store.server.uuid, 'eula.txt', 'eula=true');
            if (store.status === 'offline') {
                store.instance?.send(SocketRequest.SET_STATE, 'restart');
            }
            open = false;
        } catch (e) {
            console.error(e);
            error = httpErrorToHuman(e);
        } finally {
            loading = false;
        }
    }
</script>

<Dialog bind:open title="接受 Minecraft® EULA" preventClose>
    <div class="space-y-4 text-sm">
        {#if error}
            <Alert variant="destructive">{error}</Alert>
        {/if}
        <p class="text-muted-foreground">
            点击下方“我接受”即表示你同意
            <a
                href="https://account.mojang.com/documents/minecraft_eula"
                target="_blank"
                rel="noreferrer noopener"
                class="text-primary underline underline-offset-4">Minecraft® EULA</a
            >。
        </p>
    </div>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={loading} onclick={() => (open = false)}>取消</Button>
        <Button size="sm" {loading} onclick={accept}>我接受</Button>
    {/snippet}
</Dialog>
