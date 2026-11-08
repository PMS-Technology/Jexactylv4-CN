<script lang="ts">
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { SocketEvent } from '$lib/api/definitions/events';
    import { Button } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';

    /** Hytale device-login prompt, ported from HytaleOauthRequireFeature.tsx. */
    let { store }: { store: ServerStore } = $props();

    const VERIFY_URL = /https:\/\/oauth\.accounts\.hytale\.com\/oauth2\/device\/verify\?user_code=[\w-]+/i;

    let open = $state(false);
    let link = $state('');

    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => {
        if (store.status === 'running') return;

        // The legacy feature opened the whole console line; only the URL is a valid target.
        const match = line.match(VERIFY_URL);
        if (match) {
            link = match[0];
            open = true;
        }
    });

    function login() {
        if (!link) return;

        window.open(link, '_blank', 'noopener,noreferrer');
        open = false;
        link = '';
    }
</script>

<Dialog bind:open title="需要验证身份" preventClose onOpenChange={o => o || (link = '')}>
    <p class="text-sm text-muted-foreground">
        下载或更新服务器文件需要先登录你的 Hytale 账号进行验证，请登录后继续。
    </p>

    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (open = false)}>取消</Button>
        <Button size="sm" onclick={login}>登录</Button>
    {/snippet}
</Dialog>
