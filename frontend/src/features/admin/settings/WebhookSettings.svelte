<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ChevronLeft, ChevronRight, ExternalLink, Link as LinkIcon } from '@lucide/svelte';
    import {
        getWebhookEvents,
        sendWebhookTest,
        toggleWebhookEvent,
        updateWebhookSetting,
        type WebhookEvent,
    } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Webhooks, ported from WebhookRouter.tsx and its children. The legacy page reloaded
     * the document after every module or bulk toggle; here the flags and the event list
     * are patched in place instead.
     */
    const queryClient = useQueryClient();
    const enabled = $derived(Boolean(app.flags?.webhooks.enabled));
    const canUpdate = $derived(app.can('webhooks.update'));

    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);
    let busy = $state<string | null>(null);
    let failures = $state(0);

    async function run(key: string, task: () => Promise<void>, success?: string) {
        busy = key;
        notice = null;
        try {
            await task();
            if (success) notice = { variant: 'success', text: success };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
            failures++;
        } finally {
            busy = null;
        }
    }

    const toggleModule = () =>
        run('module', async () => {
            await updateWebhookSetting('enabled', !enabled);
            app.updateFlags({ webhooks: { ...app.flags!.webhooks, enabled: !enabled } });
        });

    // --- URL. The panel never sends the stored URL back, only whether one is set.
    let url = $state('');
    const saveUrl = (event: SubmitEvent) => {
        event.preventDefault();
        void run(
            'url',
            async () => {
                await updateWebhookSetting('url', url.trim());
                app.updateFlags({ webhooks: { ...app.flags!.webhooks, url: Boolean(url.trim()) } });
                url = '';
            },
            'Webhook 地址已保存。',
        );
    };

    // --- Events.
    const events = createQuery(() => ({
        queryKey: ['admin', 'webhook-events'],
        queryFn: getWebhookEvents,
        enabled,
    }));

    const setEvents = (map: (list: WebhookEvent[]) => WebhookEvent[]) =>
        queryClient.setQueryData<WebhookEvent[]>(['admin', 'webhook-events'], list => (list ? map(list) : list));

    const toggleEvent = (event: WebhookEvent) =>
        run(`event-${event.id}`, async () => {
            await toggleWebhookEvent(!event.enabled, event.id);
            setEvents(list => list.map(e => (e.id === event.id ? { ...e, enabled: !event.enabled } : e)));
        });

    const toggleAll = (value: boolean) =>
        run(value ? 'all-on' : 'all-off', async () => {
            await toggleWebhookEvent(value);
            setEvents(list => list.map(e => ({ ...e, enabled: value })));
        });

    let search = $state('');
    let page = $state(1);
    const PER_PAGE = 12;

    const filtered = $derived.by(() => {
        const q = search.trim().toLowerCase();
        const list = events.data ?? [];

        return q ? list.filter(e => e.key.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)) : list;
    });
    const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
    const pageItems = $derived(filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE));

    $effect(() => {
        void search;
        page = 1;
    });
</script>

<div class="space-y-6">
    {#if notice}
        <Alert variant={notice.variant}>{notice.text}</Alert>
    {/if}

    {#if !enabled}
        <Card class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <ExternalLink class="size-8 shrink-0 text-primary" />
            <div class="flex-1">
                <p class="font-semibold">Webhooks</p>
                <p class="mt-1 text-sm text-muted-foreground">
                    Webhook 系统可以把实时事件推送到你指定的地址，适合接入 Discord™、Slack™ 等平台。选择要监控的事件，事件触发时就会发送一次 webhook。
                </p>
            </div>
            {#if canUpdate}
                <Button loading={busy === 'module'} onclick={toggleModule}>启用 Webhooks</Button>
            {/if}
        </Card>
    {:else}
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><LinkIcon class="size-4" />Webhook 地址</CardTitle></CardHeader>
            <CardContent>
                <form class="flex flex-col gap-3 sm:flex-row" onsubmit={saveUrl}>
                    <Input
                        bind:value={url}
                        type="url"
                        aria-label="Webhook 地址"
                        class="flex-1"
                        placeholder={app.flags?.webhooks.url ? '已设置 webhook 地址，输入新地址可覆盖' : '在此填写 webhook 地址'}
                        disabled={!canUpdate}
                    />
                    {#if canUpdate}
                        <div class="flex gap-2">
                            <Button type="button" variant="destructive" loading={busy === 'module'} onclick={toggleModule}>停用 Webhooks</Button>
                            <Button type="submit" loading={busy === 'url'} disabled={!url.trim()}>保存</Button>
                        </div>
                    {/if}
                </form>
                <p class="mt-1.5 text-xs text-muted-foreground">设置用于发送数据的 webhook 地址，保存后立即生效。</p>
            </CardContent>
        </Card>

        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input bind:value={search} placeholder="搜索 webhook 事件…" aria-label="搜索 webhook 事件" class="lg:max-w-sm" />
            {#if canUpdate}
                <div class="flex gap-2">
                    <Button variant="ghost" loading={busy === 'test'} onclick={() => run('test', sendWebhookTest, '测试 webhook 已发送。')}>发送测试</Button>
                    <Button variant="destructive" loading={busy === 'all-off'} onclick={() => toggleAll(false)}>全部停用</Button>
                    <Button loading={busy === 'all-on'} onclick={() => toggleAll(true)}>全部启用</Button>
                </div>
            {/if}
        </div>

        {#if events.error}
            <Alert variant="destructive">{httpErrorToHuman(events.error)}</Alert>
        {:else if !events.data}
            <Spinner centered />
        {:else if !filtered.length}
            <p class="py-12 text-center text-sm text-muted-foreground">没有匹配的事件。</p>
        {:else}
            <div class="grid gap-4 lg:grid-cols-3">
                <!-- Keyed on failures: a switch flips itself on click, so remount it if the save failed. -->
                {#each pageItems as event (`${event.id}-${failures}`)}
                    <Card class="flex items-start gap-3 p-4">
                        <div class="min-w-0 flex-1">
                            <p class="font-medium capitalize">{event.key.replace(/[:-]/g, ' ')}</p>
                            <p class="mt-1 text-sm text-muted-foreground">{event.description}</p>
                        </div>
                        <Switch
                            checked={event.enabled}
                            aria-label="{event.enabled ? '停用' : '启用'} {event.key}"
                            disabled={!canUpdate || busy === `event-${event.id}`}
                            onCheckedChange={() => toggleEvent(event)}
                        />
                    </Card>
                {/each}
            </div>
            {#if totalPages > 1}
                <div class="flex items-center justify-between text-sm">
                    <p class="text-muted-foreground">第 {page} / {totalPages} 页，共 {filtered.length} 个事件</p>
                    <div class="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onclick={() => page--}><ChevronLeft />上一页</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => page++}>下一页<ChevronRight /></Button>
                    </div>
                </div>
            {/if}
        {/if}
    {/if}
</div>
