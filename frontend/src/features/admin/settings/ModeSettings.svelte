<script lang="ts">
    import { Monitor, Moon, SquareTerminal } from '@lucide/svelte';
    import { updateMode } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import type { PanelMode } from '$types/bootstrap';
    import { Button, Card } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /** Panel mode, ported from ModeSettings.tsx. */
    const canUpdate = $derived(app.can('settings.update'));

    let saving = $state<PanelMode>(undefined);
    let error = $state('');
    let saved = $state(false);
    let debugHelp = $state(false);

    async function select(mode: NonNullable<PanelMode>) {
        saving = mode;
        error = '';
        saved = false;
        try {
            await updateMode(mode);
            app.updateSettings({ mode });
            saved = true;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = undefined;
        }
    }

    const modes = [
        {
            mode: 'standard',
            icon: Monitor,
            title: '标准模式',
            text: '标准模式启用 Jexactyl 的全部常规功能，包括计费系统、工单、用户注册等。',
        },
        {
            mode: 'personal',
            icon: Moon,
            title: '个人模式',
            text: '个人模式会去掉主要面向大型组织和主机商的功能，让小规模使用者更容易托管和管理服务器。',
        },
    ] as const;
</script>

<div class="space-y-4">
    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {:else if saved}
        <Alert variant="success">面板模式已更新。</Alert>
    {/if}

    {#each modes as m (m.mode)}
        {@const Icon = m.icon}
        {@const active = app.settings?.mode === m.mode}
        <Card class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <Icon class="size-8 shrink-0 text-primary" />
            <div class="flex-1">
                <p class="font-semibold">{m.title}</p>
                <p class="mt-1 text-sm text-muted-foreground">{m.text}</p>
            </div>
            {#if canUpdate}
                <Button disabled={active || saving !== undefined} loading={saving === m.mode} onclick={() => select(m.mode)}>
                    {active ? '当前模式' : '启用'}
                </Button>
            {/if}
        </Card>
    {/each}

    <Card class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <SquareTerminal class="size-8 shrink-0 text-primary" />
        <div class="flex-1">
            <p class="font-semibold">调试模式</p>
            <p class="mt-1 text-sm text-muted-foreground">
                调试模式下所有 HTTP 请求数据都会暴露，错误会带上敏感细节一起报告。请谨慎使用，<strong class="text-foreground">切勿在生产环境开启。</strong>
            </p>
        </div>
        <Button variant="outline" disabled={app.settings?.debug} onclick={() => (debugHelp = true)}>
            {app.settings?.debug ? '已开启' : '如何开启'}
        </Button>
    </Card>
</div>

<Dialog bind:open={debugHelp} title="如何开启调试模式">
    <ol class="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>通过 SSH 登录 Web 服务器</li>
        <li>进入面板目录，例如 <code class="rounded bg-muted px-1 font-mono">/var/www/jexactyl</code></li>
        <li>打开环境文件 <code class="rounded bg-muted px-1 font-mono">.env</code></li>
        <li>将 <code class="font-mono">APP_ENV</code> 设为 local，<code class="font-mono">APP_DEBUG</code> 设为 true</li>
        <li>关闭时改回 production 与 false</li>
    </ol>
    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (debugHelp = false)}>关闭</Button>
    {/snippet}
</Dialog>
