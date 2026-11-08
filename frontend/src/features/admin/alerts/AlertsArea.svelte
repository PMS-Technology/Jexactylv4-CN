<script lang="ts">
    import { Eye, List, Paintbrush, ShieldAlert } from '@lucide/svelte';
    import { updateAlert } from '$lib/api/admin/appearance';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import type { AlertPosition, AlertType } from '$types/bootstrap';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /**
     * Panel alerts, ported from AlertRouter.tsx, AlertSettings.tsx and AlertAppearance.tsx.
     * Two tabs: content/type/enabled, and the position picker (which saves on click, as
     * the legacy one did).
     */
    const sub = $derived(router.pathname.replace(/^\/admin\/alerts\/?/, '').replace(/\/+$/, ''));
    const alert = $derived(app.flags!.alert);
    const canUpdate = $derived(app.can('alerts.update'));

    const variants: Record<AlertType, 'success' | 'info' | 'warning' | 'destructive'> = {
        success: 'success',
        info: 'info',
        warning: 'warning',
        danger: 'destructive',
    };

    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);
    let saving = $state<string | null>(null);

    async function save(key: string, patch: Partial<typeof alert>, success?: string) {
        saving = key;
        notice = null;
        try {
            const uuid = await updateAlert(patch);
            app.updateFlags({ alert: { ...app.flags!.alert, ...patch, uuid } });
            if (success) notice = { variant: 'success', text: success };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = null;
        }
    }

    // --- General tab.
    let enabled = $state(app.flags!.alert.enabled);
    let type = $state<AlertType>(app.flags!.alert.type);
    let content = $state(app.flags!.alert.content ?? '');

    // UpdateAlertSettingsRequest: content is nullable, 3–300 characters when present.
    const contentValid = $derived(content.trim() === '' || (content.trim().length >= 3 && content.trim().length <= 300));

    function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!contentValid) return;
        void save('settings', { enabled, type, content: content.trim() }, '告警设置已保存。');
    }

    // --- Appearance tab.
    const positions: { value: AlertPosition; label: string; mock: string }[] = [
        { value: 'top-center', label: '页面顶部的横幅。', mock: 'absolute inset-x-8 top-8 h-4 rounded' },
        { value: 'bottom-right', label: '右下角的悬浮提示。', mock: 'absolute right-0 bottom-0 m-4 h-4 w-20 rounded-full' },
        { value: 'bottom-left', label: '左下角的悬浮提示。', mock: 'absolute bottom-0 left-0 m-4 h-4 w-20 rounded-full' },
        { value: 'center', label: '页面中央的弹窗。', mock: 'absolute top-1/2 left-1/2 h-16 w-28 -translate-1/2 rounded' },
    ];
    const positionNames: Record<AlertPosition, string> = {
        'top-center': '顶部横幅',
        'bottom-right': '右下角',
        'bottom-left': '左下角',
        center: '中央弹窗',
    };
</script>

<svelte:head>
    <title>告警 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="面板告警" description="向用户发送警告和通知。" />

    <nav class="mb-6 flex gap-1 border-b border-border" aria-label="告警分类">
        {#each [{ path: '', name: '常规', icon: ShieldAlert }, { path: 'view', name: '外观', icon: Eye }] as tab (tab.path)}
            {@const Icon = tab.icon}
            <Link
                href={tab.path ? `/admin/alerts/${tab.path}` : '/admin/alerts'}
                end
                class="-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                activeClass="border-primary! text-foreground font-medium"
            >
                <Icon class="size-4" />{tab.name}
            </Link>
        {/each}
    </nav>

    {#if notice}
        <Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>
    {/if}

    {#if sub === ''}
        <form onsubmit={submit} class="space-y-6">
            <div class="grid gap-6 md:grid-cols-4">
                <Card>
                    <CardHeader><CardTitle class="flex items-center gap-2"><Eye class="size-4" />告警状态</CardTitle></CardHeader>
                    <CardContent class="space-y-1.5">
                        <label class="flex items-center justify-between gap-2 text-sm">
                            向用户显示告警
                            <Switch bind:checked={enabled} aria-label="向用户显示告警" disabled={!canUpdate} />
                        </label>
                        <p class="text-xs text-muted-foreground">开启后，按当前配置的告警会立即显示给用户。</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle class="flex items-center gap-2"><List class="size-4" />告警类型</CardTitle></CardHeader>
                    <CardContent class="space-y-1.5">
                        <select
                            bind:value={type}
                            aria-label="告警类型"
                            disabled={!canUpdate}
                            class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                        >
                            <option value="success">成功（绿色）</option>
                            <option value="info">信息（蓝色）</option>
                            <option value="warning">警告（黄色）</option>
                            <option value="danger">危险（红色）</option>
                        </select>
                        <p class="text-xs text-muted-foreground">设置告警的严重程度和颜色。</p>
                    </CardContent>
                </Card>
                <Card class="md:col-span-2">
                    <CardHeader><CardTitle class="flex items-center gap-2"><Paintbrush class="size-4" />告警内容</CardTitle></CardHeader>
                    <CardContent class="space-y-1.5">
                        <Input
                            bind:value={content}
                            aria-label="告警内容"
                            maxlength={300}
                            disabled={!canUpdate}
                            error={contentValid ? undefined : '内容需为 3–300 个字符，或留空。'}
                        />
                        <p class="text-xs text-muted-foreground">显示给用户的告警内容。</p>
                        <p class="text-xs text-muted-foreground">当前 UUID：<span class="font-mono">{alert.uuid}</span></p>
                    </CardContent>
                </Card>
            </div>
            {#if canUpdate}
                <div class="flex justify-end">
                    <Button type="submit" loading={saving === 'settings'} disabled={!contentValid}>保存更改</Button>
                </div>
            {/if}
        </form>
    {:else if sub === 'view'}
        <div class="space-y-6">
            <Card>
                <CardHeader><CardTitle>预览</CardTitle></CardHeader>
                <CardContent>
                    {#if !alert.enabled}
                        <p class="text-center text-sm text-muted-foreground">告警当前已关闭，没有可预览的内容。</p>
                    {:else}
                        <p class="mb-3 text-sm text-muted-foreground">当前显示方式：{positionNames[alert.position]}</p>
                        <Alert variant={variants[alert.type]}>{alert.content}</Alert>
                    {/if}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between">
                        <CardTitle>告警位置</CardTitle>
                        {#if saving?.startsWith('position')}<Spinner size="sm" />{/if}
                    </div>
                </CardHeader>
                <CardContent>
                    <div class="grid gap-6 md:grid-cols-4" role="radiogroup" aria-label="告警位置">
                        {#each positions as p (p.value)}
                            {@const selected = alert.position === p.value}
                            <button
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={positionNames[p.value]}
                                disabled={!canUpdate || saving !== null}
                                onclick={() => save(`position-${p.value}`, { position: p.value }, `告警位置已改为${positionNames[p.value]}。`)}
                                class="text-left disabled:cursor-not-allowed"
                            >
                                <div
                                    class="relative h-40 w-full rounded-lg border-2 bg-muted/50 transition-colors hover:bg-muted {selected
                                        ? 'border-primary'
                                        : 'border-transparent'}"
                                >
                                    <div class="{p.mock} bg-primary"></div>
                                </div>
                                <p class="mt-1 text-xs text-muted-foreground">{p.label}</p>
                            </button>
                        {/each}
                    </div>
                </CardContent>
            </Card>
        </div>
    {:else}
        <NotFound backTo="/admin/alerts" />
    {/if}
</div>
