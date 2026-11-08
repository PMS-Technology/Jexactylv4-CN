<script lang="ts">
    import { Eye, Image, Paintbrush, PlusCircle, RefreshCw, Shapes } from '@lucide/svelte';
    import { updateGeneralSettings, type GeneralSettings } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /** Core settings, ported from GeneralSettings.tsx. */
    const s = app.settings!;

    let values = $state<GeneralSettings>({
        name: s.name,
        logo: s.logo ?? '',
        auto_update: s.auto_update,
        indicators: s.indicators,
        speed_dial: s.speed_dial,
        activity: { enabled: { ...s.activity.enabled } },
    });

    const canUpdate = $derived(app.can('settings.update'));

    let saving = $state(false);
    let error = $state('');
    let saved = $state(false);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (saving) return;

        saving = true;
        error = '';
        saved = false;
        try {
            await updateGeneralSettings(values);
            app.updateSettings({ ...values, logo: values.logo || null, activity: { enabled: { ...values.activity.enabled } } });
            saved = true;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    const toggles = [
        { key: 'auto_update', icon: RefreshCw, title: '自动更新', label: '允许自动更新', help: '启用后，面板会自动更新以保持安全并获得新功能。' },
        { key: 'indicators', icon: Shapes, title: '管理员指示器', label: '显示管理员指示器', help: '启用后，管理后台右上角会显示各模块的启用状态，仅限大屏幕。' },
        { key: 'speed_dial', icon: PlusCircle, title: '快捷操作', label: '显示快捷操作按钮', help: '启用后，管理员在用户端会看到创建服务器、用户等快捷入口。' },
    ] as const;
</script>

<form onsubmit={submit} class="space-y-6">
    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {:else if saved}
        <Alert variant="success">设置已保存。</Alert>
    {/if}

    <div class="grid gap-6 md:grid-cols-3">
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Paintbrush class="size-4" />面板名称</CardTitle></CardHeader>
            <CardContent class="space-y-1.5">
                <Input bind:value={values.name} aria-label="面板名称" minlength={3} maxlength={40} disabled={!canUpdate} />
                <p class="text-xs text-muted-foreground">按需设置此面板的名称，3–40 个字符。</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Image class="size-4" />面板 Logo</CardTitle></CardHeader>
            <CardContent class="space-y-1.5">
                <Input bind:value={values.logo as string} type="url" aria-label="面板 Logo 地址" placeholder="https://…" disabled={!canUpdate} />
                <p class="text-xs text-muted-foreground">Logo 图片地址，留空则使用默认图标。</p>
            </CardContent>
        </Card>
        {#each toggles as t (t.key)}
            {@const Icon = t.icon}
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Icon class="size-4" />{t.title}</CardTitle></CardHeader>
                <CardContent class="space-y-1.5">
                    <label class="flex items-center justify-between gap-2 text-sm">
                        {t.label}
                        <Switch bind:checked={values[t.key]} aria-label={t.label} disabled={!canUpdate} />
                    </label>
                    <p class="text-xs text-muted-foreground">{t.help}</p>
                </CardContent>
            </Card>
        {/each}
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Eye class="size-4" />活动日志</CardTitle></CardHeader>
            <CardContent class="space-y-1.5">
                <div class="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-sm">
                    {#each [['account', '账号'], ['server', '服务器'], ['admin', '管理']] as const as [key, label] (key)}
                        <label class="flex items-center justify-center gap-2">
                            {label}
                            <Switch bind:checked={values.activity.enabled[key]} aria-label="记录{label}活动" disabled={!canUpdate} />
                        </label>
                    {/each}
                </div>
                <p class="text-xs text-muted-foreground">选择要记录活动日志的范围，默认全部开启。</p>
            </CardContent>
        </Card>
    </div>

    <div class="flex items-center justify-between gap-4">
        <p class="text-xs text-muted-foreground">部分改动需要用户刷新页面后才会生效。</p>
        {#if canUpdate}
            <Button type="submit" loading={saving}>保存更改</Button>
        {/if}
    </div>
</form>
