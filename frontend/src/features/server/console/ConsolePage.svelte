<script lang="ts">
    import { Download, LoaderCircle, Pencil } from '@lucide/svelte';
    import stripAnsi from 'strip-ansi';
    import { app } from '$lib/stores/app.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent } from '$lib/api/definitions/events';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { renameServer, reinstallServer } from '$lib/api/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Textarea from '$lib/ui/Textarea.svelte';
    import Terminal from './Terminal.svelte';
    import StatsCharts from './StatsCharts.svelte';
    import DetailsStats from './DetailsStats.svelte';
    import StatusControls from './StatusControls.svelte';
    import Features from '../features/Features.svelte';

    /**
     * Server console, ported from ServerConsoleContainer.tsx: header with the live
     * status, power controls, the terminal, live resource strip and sparklines.
     */
    let { store }: { store: ServerStore } = $props();

    const expandKey = `console_expand_${app.user?.uuid ?? 'user'}`;

    function readExpand(): boolean {
        try {
            return JSON.parse(localStorage.getItem(expandKey) ?? 'false') === true;
        } catch {
            return false;
        }
    }

    let expand = $state(readExpand());

    function toggleExpand() {
        expand = !expand;
        try {
            localStorage.setItem(expandKey, JSON.stringify(expand));
        } catch {
            // Private browsing; the preference just won't persist.
        }
    }

    const statusMeta = $derived.by(() => {
        if (store.isInstalling) return { text: '安装中', tone: 'text-amber-500' };
        if (store.server?.isTransferring) return { text: '迁移中', tone: 'text-amber-500' };
        switch (store.status) {
            case 'running':
                return { text: '运行中', tone: 'text-green-500' };
            case 'offline':
                return { text: '离线', tone: 'text-red-500' };
            case null:
                return { text: '离线', tone: 'text-red-500' };
            default:
                return { text: store.status ?? '', tone: 'text-amber-500' };
        }
    });

    const renewalDays = $derived.by(() => {
        const date = store.server?.renewalDate;
        if (!date) return null;

        return Math.floor((date.getTime() - Date.now()) / 86_400_000);
    });

    // Renewal warning window, ported: overdue but within the free grace period.
    const showRenewalWarning = $derived(
        Boolean(
            store.server?.billingProductId &&
                renewalDays !== null &&
                renewalDays <= 0 &&
                Math.abs(renewalDays) <= (app.flags?.billing.renewal.days || 7),
        ),
    );

    // --- Edit dialog -------------------------------------------------------
    let editOpen = $state(false);
    let name = $state('');
    let description = $state('');
    let saving = $state(false);
    let editError = $state('');

    function openEdit() {
        name = store.server?.name ?? '';
        description = store.server?.description ?? '';
        editError = '';
        editOpen = true;
    }

    async function saveEdit() {
        if (!store.server || saving) return;

        saving = true;
        editError = '';
        try {
            await renameServer(store.server.uuid, name, description);
            store.patchServer({ name, description });
            editOpen = false;
        } catch (error) {
            editError = httpErrorToHuman(error);
        } finally {
            saving = false;
        }
    }

    // --- Reinstall dialog --------------------------------------------------
    let reinstallOpen = $state(false);
    let reinstalling = $state(false);
    let reinstallError = $state('');

    async function reinstall() {
        if (!store.server || reinstalling) return;

        reinstalling = true;
        reinstallError = '';
        try {
            await reinstallServer(store.server.uuid);
            await store.refetch();
            reinstallOpen = false;
        } catch (error) {
            reinstallError = httpErrorToHuman(error);
        } finally {
            reinstalling = false;
        }
    }

    // --- Console log export (SaveButton) ----------------------------------
    let consoleLog: string[] = [];

    websocketEvent(store, SocketEvent.CONSOLE_OUTPUT, (line: string) => {
        consoleLog = [...consoleLog, line.startsWith('>') ? line.substring(1) : line].slice(-1000);
    });

    let savingLogs = $state(false);
    let savedNotice = $state('');

    async function saveLogs() {
        if (!store.server || savingLogs) return;

        savingLogs = true;
        savedNotice = '';
        try {
            const data = stripAnsi(consoleLog.map(it => it.replace('\r', '')).join('\n')) || '';
            const file = `/.console-logs/${new Date().toLocaleTimeString()}.log`;
            const { saveFileContents } = await import('$lib/api/files');
            await saveFileContents(store.server.uuid, file, data);
            savedNotice = `日志已保存到 ${file}`;
        } catch {
            savedNotice = '保存日志失败，请重试。';
        } finally {
            savingLogs = false;
        }
    }
</script>

<svelte:head>
    <title>{store.server?.name ?? '服务器'} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if showRenewalWarning && renewalDays !== null}
        <Alert variant="warning" class="mb-4">
            你的服务器已逾期 {Math.abs(renewalDays)} 天未续期。请在
            {app.flags?.billing.renewal.days || 7}
            天内续期，否则将被永久停用。服务器文件和数据会保留。
        </Alert>
    {/if}

    {#if store.server?.isNodeUnderMaintenance}
        <Alert variant="warning" class="mb-4">此服务器所在节点正在维护，所有操作均不可用。</Alert>
    {:else if store.isInstalling}
        <Alert variant="warning" class="mb-4">此服务器正在执行安装流程，大部分操作不可用。</Alert>
    {:else if store.server?.isTransferring}
        <Alert variant="warning" class="mb-4">此服务器正在迁移到其他节点，所有操作均不可用。</Alert>
    {/if}

    <div class="mb-4 flex flex-col justify-between gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
                <h1 class="font-header line-clamp-1 text-2xl leading-relaxed">{store.server?.name}</h1>
                <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-2xs font-medium">
                    {#if store.isInstalling}
                        <Download class="size-3" />
                        安装中
                    {:else if store.server?.isTransferring}
                        <LoaderCircle class="size-3 animate-spin" />
                        迁移中
                    {:else}
                        <span class="size-2 rounded-full {statusMeta.tone === 'text-green-500' ? 'bg-green-500' : statusMeta.tone === 'text-red-500' ? 'bg-red-500' : 'bg-amber-500'}"></span>
                        {statusMeta.text}
                    {/if}
                </span>
                {#if store.can('settings.rename')}
                    <button
                        type="button"
                        class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label="编辑服务器信息"
                        onclick={openEdit}
                    >
                        <Pencil class="size-3.5" />
                    </button>
                {/if}
            </div>
            <p class="line-clamp-2 text-sm text-muted-foreground">
                {store.server?.description || store.server?.uuid}
                {#if renewalDays !== null && renewalDays > 0}
                    <span class="ml-1">&bull; 距续期 {renewalDays} 天</span>
                {/if}
            </p>
        </div>

        <div class="flex items-center gap-2">
            <button
                type="button"
                class="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors
                       hover:bg-accent hover:text-accent-foreground md:inline-flex"
                onclick={saveLogs}
                disabled={savingLogs}
                title="将控制台日志保存到 /.console-logs/"
            >
                <Download class="size-4" />
                保存日志
            </button>
            {#if store.can(['control.start', 'control.stop', 'control.restart'])}
                <StatusControls {store} />
            {/if}
        </div>
    </div>

    {#if !expand}
        <DetailsStats {store} />
    {/if}

    <div class="mt-4 grid gap-2 sm:gap-4 lg:grid-cols-4">
        <!-- min-w-0: xterm measures its container; without it the auto min-content
             width of the grid item pushes the terminal past the viewport. -->
        <div class="flex min-w-0 lg:col-span-3">
            <Terminal {store} {expand} onToggleExpand={toggleExpand} />
        </div>
        {#if !expand}
            <div class="my-auto min-w-0">
                <StatsCharts {store} />
            </div>
        {/if}
    </div>
</div>

<Features {store} enabled={store.server?.eggFeatures ?? []} />

{#if savedNotice}
    <div class="fixed right-4 bottom-20 z-50 rounded-lg border border-border bg-popover px-4 py-2 text-sm text-popover-foreground shadow-lg md:bottom-4">
        {savedNotice}
    </div>
{/if}

<Dialog
    bind:open={editOpen}
    title="编辑服务器"
    preventClose={saving}
    footer={undefined}
>
    <div class="space-y-4">
        {#if editError}
            <Alert variant="destructive">{editError}</Alert>
        {/if}
        <div>
            <Label for="server-name">名称</Label>
            <Input id="server-name" bind:value={name} disabled={saving} maxlength={191} />
        </div>
        <div>
            <Label for="server-description">描述</Label>
            <Textarea id="server-description" bind:value={description} rows={3} disabled={saving} />
        </div>
        <div class="flex items-center justify-between">
            {#if store.can('control.console')}
                <Button variant="destructive" size="sm" onclick={() => (reinstallOpen = true)}>重装服务器</Button>
            {/if}
            <Button size="sm" loading={saving} onclick={saveEdit}>保存</Button>
        </div>
    </div>
</Dialog>

<ConfirmDialog
    bind:open={reinstallOpen}
    title="确认重装服务器"
    confirmLabel="是，重装服务器"
    onConfirm={reinstall}
>
    {#if reinstallError}
        <Alert variant="destructive">{reinstallError}</Alert>
    {/if}
    <div class="rounded-lg bg-warning/10 p-4 text-sm">
        重装会停止服务器并重新执行初始安装脚本。
        <strong class="font-medium">部分文件可能被删除或修改，请先备份你的数据。</strong>
    </div>
</ConfirmDialog>
