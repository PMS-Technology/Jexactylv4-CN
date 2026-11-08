<script lang="ts">
    import { CheckCircle2, Monitor, Paintbrush, RotateCcw } from '@lucide/svelte';
    import { resetTheme, updateThemeColor, type ThemeColorKey } from '$lib/api/admin/appearance';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /**
     * Theme colours, ported from ThemeContainer.tsx, ColorSelect.tsx and Preview.tsx.
     *
     * These are the brand colours in `window.ThemeConfiguration`. The legacy Preact pages
     * paint with them; this Svelte shell uses its own design tokens and only reads
     * `primary` for chart lines, so the preview is a mock-up of the legacy layout.
     */
    const fields: { key: ThemeColorKey; label: string; help: string }[] = [
        { key: 'primary', label: '主要内容（强调色）', help: '应用的主文字色，也用于按钮等组件。' },
        { key: 'secondary', label: '次要内容（组件）', help: '卡片、表格等组件的底色，通常是不易与背景混淆的深色。' },
        { key: 'background', label: '背景色', help: '整个应用的背景颜色。' },
        { key: 'headers', label: '组件标题', help: '表单、卡片、表格的标题栏颜色，建议比“次要内容”稍深。' },
        { key: 'sidebar', label: '侧边栏与导航', help: '左侧侧边栏的颜色。' },
    ];

    const canUpdate = $derived(app.can('settings.update'));

    const initial = app.theme?.colors ?? { headers: '', sidebar: '', background: '' };
    let colors = $state<Record<ThemeColorKey, string>>({
        primary: initial.primary ?? '#16a34a',
        secondary: initial.secondary ?? '#27272a',
        background: initial.background,
        headers: initial.headers,
        sidebar: initial.sidebar,
    });

    let saving = $state(0);
    let saved = $state(false);
    let error = $state('');

    // A colour input fires on every drag step; the legacy page sent a request for each.
    const timers: Partial<Record<ThemeColorKey, ReturnType<typeof setTimeout>>> = {};

    function change(key: ThemeColorKey, value: string) {
        colors[key] = value;
        clearTimeout(timers[key]);
        timers[key] = setTimeout(() => void save(key, value), 400);
    }

    async function save(key: ThemeColorKey, value: string) {
        saving++;
        saved = false;
        error = '';
        try {
            await updateThemeColor(key, value);
            if (app.theme) app.theme = { colors: { ...app.theme.colors, [key]: value } };
            saved = true;
            setTimeout(() => (saved = false), 2000);
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving--;
        }
    }

    let resetOpen = $state(false);

    async function reset() {
        await resetTheme();
        // The defaults come from config and reach the page through the Blade globals.
        window.location.reload();
    }
</script>

<svelte:head>
    <title>主题 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="系统主题" description="查看并修改界面的品牌配色。">
        {#if canUpdate}
            <Button variant="outline" onclick={() => (resetOpen = true)}><RotateCcw />恢复默认</Button>
        {/if}
    </PageHeader>

    {#if error}
        <Alert variant="destructive" class="mb-4">{error}</Alert>
    {/if}

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
            <CardHeader>
                <div class="flex items-center justify-between">
                    <CardTitle class="flex items-center gap-2"><Paintbrush class="size-4" />颜色</CardTitle>
                    {#if saving > 0}
                        <Spinner size="sm" />
                    {:else if saved}
                        <CheckCircle2 class="size-4 text-success" aria-label="已保存" />
                    {/if}
                </div>
            </CardHeader>
            <CardContent class="space-y-5">
                {#each fields as field (field.key)}
                    <div class="space-y-1.5">
                        <label for="color-{field.key}" class="text-sm font-medium">{field.label}</label>
                        <div class="flex items-center gap-2">
                            <input
                                id="color-{field.key}"
                                type="color"
                                value={colors[field.key]}
                                disabled={!canUpdate}
                                oninput={e => change(field.key, e.currentTarget.value)}
                                class="h-9 w-14 cursor-pointer rounded-md border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <code class="font-mono text-xs text-muted-foreground">{colors[field.key]}</code>
                        </div>
                        <p class="text-xs text-muted-foreground">{field.help}</p>
                    </div>
                {/each}
            </CardContent>
        </Card>

        <Card class="xl:col-span-2">
            <CardHeader><CardTitle class="flex items-center gap-2"><Monitor class="size-4" />预览</CardTitle></CardHeader>
            <CardContent class="space-y-2">
                <!-- A mock-up rather than a live frame: SetSecurityHeaders sends
                     X-Frame-Options: DENY, so the legacy <iframe src="/"> preview was always blank. -->
                <div
                    class="flex h-[50vh] min-h-72 overflow-hidden rounded-lg border-2 text-xs text-zinc-100 transition-colors"
                    style:border-color={colors.primary}
                    style:background-color={colors.background}
                    aria-label="主题预览"
                    role="img"
                >
                    <div class="flex w-16 shrink-0 flex-col gap-2 p-2 sm:w-32 sm:p-3" style:background-color={colors.sidebar}>
                        <div class="h-3 w-16 rounded bg-white/70"></div>
                        {#each [0, 1, 2, 3, 4] as i (i)}
                            <div class="h-2.5 rounded {i === 1 ? '' : 'bg-white/20'}" style:background-color={i === 1 ? colors.primary : undefined}></div>
                        {/each}
                    </div>
                    <div class="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
                        <div class="h-4 w-40 rounded bg-white/80"></div>
                        <div class="overflow-hidden rounded-md" style:background-color={colors.secondary}>
                            <div class="flex items-center justify-between px-3 py-2" style:background-color={colors.headers}>
                                <span class="font-medium">服务器列表</span>
                                <span class="rounded px-2 py-0.5 font-medium text-white" style:background-color={colors.primary}>新建</span>
                            </div>
                            {#each ['survival-01', 'creative-02', 'lobby'] as row (row)}
                                <div class="flex items-center justify-between border-t border-black/30 px-3 py-2">
                                    <span>{row}</span>
                                    <span style:color={colors.primary}>运行中</span>
                                </div>
                            {/each}
                        </div>
                        <div class="grid grid-cols-3 gap-3">
                            {#each ['CPU', '内存', '磁盘'] as stat (stat)}
                                <div class="rounded-md p-3" style:background-color={colors.secondary}>
                                    <p class="text-zinc-400">{stat}</p>
                                    <div class="mt-2 h-1.5 overflow-hidden rounded bg-black/40">
                                        <div class="h-full w-2/3" style:background-color={colors.primary}></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
                <p class="text-xs text-muted-foreground">示意图。这些颜色作用于尚未迁移的旧版页面，新前端使用自己的配色方案。</p>
            </CardContent>
        </Card>
    </div>
</div>

<ConfirmDialog bind:open={resetOpen} title="确认恢复默认主题" confirmLabel="恢复默认" onConfirm={reset}>
    <p>此操作会立即清除所有自定义配色，恢复 Jexactyl 的默认外观，且无法撤销。</p>
</ConfirmDialog>
