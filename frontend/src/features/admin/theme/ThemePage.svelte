<script lang="ts">
    import { CheckCircle2, Paintbrush, RotateCcw } from '@lucide/svelte';
    import { resetTheme, updateThemeColor } from '$lib/api/admin/appearance';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { theme } from '$lib/stores/theme.svelte';
    import { BRAND_PRESETS, DEFAULT_BRAND, normalizeBrand } from '$lib/theme/presets';
    import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Meter, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /**
     * The panel's brand colour.
     *
     * This page used to edit five colours: the accent, a secondary tone and the
     * background, header and sidebar surfaces of the legacy layout. Those surfaces
     * are not what the current frontend draws with, so what is configurable now is
     * the one colour the whole panel is built around.
     *
     * The picked colour is a hue, not a tone: the tokens in `app.css` pin its
     * lightness per mode, so it stays readable as a button fill, as text and as a
     * label on its own tint whatever colour it is. The preview below shows both
     * modes with the panel's own components, rather than a drawing of the old one.
     */
    const canUpdate = $derived(app.can('settings.update'));

    /** The colour that is actually stored; the page falls back to it when a save fails. */
    const initial = normalizeBrand(app.theme?.colors?.primary) ?? DEFAULT_BRAND;
    let stored = $state(initial);
    let brand = $state(initial);
    let saving = $state(false);
    let saved = $state(false);
    let error = $state('');

    // A colour input fires on every drag step; the legacy page sent a request for
    // each. The colour is applied locally straight away and stored once the drag
    // settles, so the page shows the colour while it is still being picked.
    let timer: ReturnType<typeof setTimeout> | undefined;

    function change(value: string) {
        const hex = normalizeBrand(value);
        if (!hex) return;

        brand = hex;
        theme.setBrand(hex);
        saved = false;
        clearTimeout(timer);
        timer = setTimeout(() => void save(hex), 400);
    }

    async function save(hex: string) {
        saving = true;
        error = '';
        try {
            await updateThemeColor('primary', hex);
            stored = hex;
            if (app.theme) app.theme = { colors: { ...app.theme.colors, primary: hex } };
            saved = true;
            setTimeout(() => (saved = false), 2000);
        } catch (e) {
            error = httpErrorToHuman(e);
            // Put the stored colour back, so the page and the panel agree again.
            brand = stored;
            theme.setBrand(stored);
        } finally {
            saving = false;
        }
    }

    let resetOpen = $state(false);

    async function reset() {
        await resetTheme();
        // The defaults come from config and reach the page through the Blade globals.
        window.location.reload();
    }

    /** The two surfaces the preview shows, each with the token set it uses. */
    const surfaces = [
        { key: 'light', label: '浅色模式', surface: 'surface-light' },
        { key: 'dark', label: '深色模式', surface: 'surface-dark' },
    ] as const;
</script>

<svelte:head>
    <title>主题 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="系统主题" description="选择面板的品牌色，其余配色由它推导。">
        {#if canUpdate}
            <Button variant="outline" onclick={() => (resetOpen = true)}><RotateCcw />恢复默认</Button>
        {/if}
    </PageHeader>

    {#if error}
        <Alert variant="destructive" class="mb-4">{error}</Alert>
    {/if}

    <div class="grid gap-4 lg:grid-cols-3">
        <Card class="lg:col-span-1">
            <CardHeader>
                <div class="flex items-center justify-between">
                    <CardTitle class="flex items-center gap-2"><Paintbrush class="size-4" />品牌色</CardTitle>
                    {#if saving}
                        <Spinner size="sm" />
                    {:else if saved}
                        <CheckCircle2 class="size-4 text-success" aria-label="已保存" />
                    {/if}
                </div>
            </CardHeader>
            <CardContent class="space-y-5">
                <div class="space-y-1.5">
                    <label for="brand-color" class="text-sm font-medium">自定义颜色</label>
                    <div class="flex items-center gap-2">
                        <input
                            id="brand-color"
                            type="color"
                            value={brand}
                            disabled={!canUpdate}
                            oninput={e => change(e.currentTarget.value)}
                            class="h-9 w-14 cursor-pointer rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <code class="font-mono text-xs text-muted-foreground">{brand}</code>
                    </div>
                    <p class="text-xs text-muted-foreground">
                        面板会保留这个色相，并按明暗模式固定明度，因此它在任何表面上都能读。
                    </p>
                </div>

                <div class="space-y-1.5">
                    <p class="text-sm font-medium">预设</p>
                    <div class="flex flex-wrap gap-3">
                        {#each BRAND_PRESETS as preset (preset.hex)}
                            <div class="flex flex-col items-center gap-1">
                                <button
                                    type="button"
                                    disabled={!canUpdate}
                                    onclick={() => change(preset.hex)}
                                    title={preset.name}
                                    aria-label={preset.name}
                                    aria-pressed={brand === preset.hex}
                                    style:background-color={preset.hex}
                                    class="size-9 rounded-full border-2 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 {brand === preset.hex
                                        ? 'scale-110 border-foreground'
                                        : 'border-border'}"
                                ></button>
                                <span class="text-2xs text-muted-foreground">{preset.name}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card class="lg:col-span-2">
            <CardHeader><CardTitle>预览</CardTitle></CardHeader>
            <CardContent class="space-y-4">
                <div class="grid gap-4 xl:grid-cols-2">
                    {#each surfaces as preview (preview.key)}
                        <div>
                            <p class="mb-1.5 text-2xs font-medium text-muted-foreground">{preview.label}</p>
                            <div
                                class="rounded-lg border border-border bg-background p-4 text-foreground {preview.surface}"
                            >
                                <div class="space-y-3">
                                    <div class="flex flex-wrap items-center gap-2">
                                        <Button size="sm">主要按钮</Button>
                                        <Button size="sm" variant="outline">次要按钮</Button>
                                        <Button size="sm" variant="destructive">危险操作</Button>
                                    </div>

                                    <div class="flex flex-wrap items-center gap-2">
                                        <Badge variant="success">已启用</Badge>
                                        <Badge variant="warning">待处理</Badge>
                                        <Badge variant="destructive">已暂停</Badge>
                                        <span
                                            class="rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-medium text-primary"
                                        >
                                            品牌标签
                                        </span>
                                    </div>

                                    <Card>
                                        <CardHeader><CardTitle>服务器列表</CardTitle></CardHeader>
                                        <CardContent class="space-y-2">
                                            <div class="flex items-center justify-between text-sm">
                                                <span>survival-01</span>
                                                <span class="text-primary">运行中</span>
                                            </div>
                                            <p class="text-xs text-muted-foreground">正文与次要文字</p>
                                        </CardContent>
                                    </Card>

                                    <div class="space-y-1.5">
                                        <div class="flex items-baseline justify-between text-2xs">
                                            <span>内存</span>
                                            <span class="text-muted-foreground">1.5 GiB / 4 GiB</span>
                                        </div>
                                        <Meter value={1.5} max={4} fillClass="bg-chart-1" aria-label="内存" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
                <p class="text-xs text-muted-foreground">
                    预览使用面板自身的组件与配色变量，两种模式同时显示；改动会立即应用到整个面板。
                </p>
            </CardContent>
        </Card>
    </div>
</div>

<ConfirmDialog bind:open={resetOpen} title="确认恢复默认主题" confirmLabel="恢复默认" onConfirm={reset}>
    <p>此操作会立即清除所有自定义配色，恢复 Jexactyl 的默认外观，且无法撤销。</p>
</ConfirmDialog>
