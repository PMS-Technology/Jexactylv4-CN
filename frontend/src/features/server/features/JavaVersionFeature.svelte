<script lang="ts">
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { SocketEvent, SocketRequest } from '$lib/api/definitions/events';
    import { getServerStartup, setDockerImage } from '$lib/api/startup';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Select, Spinner } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { lineMatches } from './index';

    /** Unsupported Java prompt with a Docker image picker, ported from JavaVersionModalFeature.tsx. */
    let { store }: { store: ServerStore } = $props();

    const MATCH_ERRORS = [
        'minecraft 1.17 requires running the server with java 16 or above',
        'minecraft 1.18 requires running the server with java 17 or above',
        'java.lang.unsupportedclassversionerror',
        'unsupported major.minor version',
        'has been compiled by a more recent version of the java runtime',
    ];

    const canChange = $derived(store.can('startup.docker-image'));

    let open = $state(false);
    let images = $state<Record<string, string> | null>(null);
    let selected = $state('');
    let loadingImages = $state(false);
    let saving = $state(false);
    let error = $state('');

    const imageOptions = $derived(
        Object.entries(images ?? {}).map(([label, image]) => ({ value: image, label })),
    );

    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => {
        if (store.status === 'running' || open) return;

        if (lineMatches(line, MATCH_ERRORS)) {
            error = '';
            open = true;
            if (canChange) void loadImages();
        }
    });

    async function loadImages() {
        if (!store.server) return;

        loadingImages = true;
        try {
            const startup = await getServerStartup(store.server.uuid);
            images = startup.dockerImages;
            // The legacy select started on the first image regardless of the current one.
            selected = Object.values(images)[0] ?? '';
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            loadingImages = false;
        }
    }

    async function update() {
        if (!store.server || !selected || saving) return;

        saving = true;
        error = '';
        try {
            await setDockerImage(store.server.uuid, selected);
            store.patchServer({ dockerImage: selected });
            if (store.status === 'offline') {
                store.instance?.send(SocketRequest.SET_STATE, 'restart');
            }
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<Dialog bind:open title="Java 版本不受支持" preventClose>
    <div class="space-y-4 text-sm">
        {#if error}
            <Alert variant="destructive">{error}</Alert>
        {/if}
        <p class="text-muted-foreground">
            此服务器当前使用的 Java 版本不受支持，无法启动。
            {#if canChange}请从下方选择一个受支持的版本以继续启动服务器。{/if}
        </p>
        {#if canChange}
            <div class="relative">
                <Select
                    aria-label="Docker 镜像"
                    items={imageOptions}
                    bind:value={selected}
                    disabled={!images || saving}
                />
                {#if loadingImages}
                    <div class="absolute inset-y-0 right-8 flex items-center"><Spinner size="sm" /></div>
                {/if}
            </div>
        {/if}
    </div>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (open = false)}>取消</Button>
        {#if canChange}
            <Button size="sm" loading={saving} disabled={!selected} onclick={update}>更新 Docker 镜像</Button>
        {/if}
    {/snippet}
</Dialog>
