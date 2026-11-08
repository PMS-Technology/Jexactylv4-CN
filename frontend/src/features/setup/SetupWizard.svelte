<script lang="ts">
    import { ArrowLeft, ArrowRight, Check, CircleCheck, Egg, Layers, Monitor, Moon, Server, User, X } from '@lucide/svelte';
    import { updateThemeColor } from '$lib/api/admin/appearance';
    import { finishSetup, getSetupData, updateMode, type SetupData } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import type { PanelMode } from '$types/bootstrap';
    import { Button, Card, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * First-run wizard for a root admin, ported from admin/setup/SetupContainer.tsx,
     * MigrationChecker.tsx, ThemeSelect.tsx and ModeSelection.tsx. App.svelte shows it in
     * place of the whole app while `settings.setup` is false, like the legacy App.tsx.
     * Differences: failed requests show an error (the legacy steps only logged them, and a
     * failed finish left the button doing nothing); the colour tick follows the colour
     * just picked (it stayed on the colour the wizard opened with).
     */
    const name = $derived(app.settings?.name || 'Jexactyl');
    const steps = ['欢迎', '现有数据', '主题颜色', '面板模式', '完成'];
    let step = $state(0);

    // --- Existing data
    let data = $state<SetupData | null>(null);
    let dataError = $state('');
    $effect(() => {
        if (step !== 1 || data) return;
        dataError = '';
        getSetupData()
            .then(d => (data = d))
            .catch(e => (dataError = httpErrorToHuman(e)));
    });

    // --- Theme colour
    const colors = [
        { hex: '#16a34a', name: 'Jexactyl 绿' },
        { hex: '#12aaaa', name: '青绿' },
        { hex: '#ff0000', name: '砖红' },
        { hex: '#9D00FF', name: '鸢尾紫' },
        { hex: '#FFA500', name: '橙' },
        { hex: '#32559f', name: 'Ptero 蓝' },
        { hex: '#ff99c8', name: '粉' },
        { hex: '#5e6472', name: '灰' },
    ];
    let primary = $state(app.theme?.colors?.primary ?? '#16a34a');
    let colorSaving = $state<string | null>(null);
    let colorError = $state('');

    async function pickColor(hex: string) {
        colorSaving = hex;
        colorError = '';
        try {
            await updateThemeColor('primary', hex);
            primary = hex;
            if (app.theme) app.theme = { colors: { ...app.theme.colors, primary: hex } };
        } catch (e) {
            colorError = httpErrorToHuman(e);
        } finally {
            colorSaving = null;
        }
    }

    // --- Mode
    const modes = [
        { mode: 'standard', icon: Monitor, title: '标准模式', text: '启用 Jexactyl 的全部常规功能，包括计费系统、工单、用户注册等。适合主机商和需要管理大量用户的团队。' },
        { mode: 'personal', icon: Moon, title: '个人模式', text: '去掉主要面向主机商的功能，只保留管理游戏服务器需要的部分。适合自己或小圈子使用。' },
    ] as const;
    let modeSaving = $state<PanelMode>(undefined);
    let modeError = $state('');

    async function pickMode(mode: NonNullable<PanelMode>) {
        modeSaving = mode;
        modeError = '';
        try {
            await updateMode(mode);
            app.updateSettings({ mode });
        } catch (e) {
            modeError = httpErrorToHuman(e);
        } finally {
            modeSaving = undefined;
        }
    }

    // --- Finish
    let finishing = $state(false);
    let finishError = $state('');

    async function finish() {
        finishing = true;
        finishError = '';
        try {
            await finishSetup();
            // Mode and setup state come from the page bootstrap, so reload to pick them up.
            window.location.reload();
        } catch (e) {
            finishError = httpErrorToHuman(e);
            finishing = false;
        }
    }

    const busy = $derived(finishing || colorSaving !== null || modeSaving !== undefined);
</script>

<svelte:head>
    <title>安装向导 | {name}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
    <header class="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <p class="font-header font-semibold">{name}</p>
        <ol class="flex items-center gap-2 text-xs" aria-label="安装步骤">
            {#each steps as label, i (label)}
                <li class="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
                    <span
                        class="flex size-6 items-center justify-center rounded-full border text-[11px] {i < step
                            ? 'border-primary bg-primary text-primary-foreground'
                            : i === step
                              ? 'border-primary text-primary'
                              : 'border-border text-muted-foreground'}"
                    >
                        {#if i < step}<Check class="size-3.5" />{:else}{i + 1}{/if}
                    </span>
                    <span class="hidden md:inline {i === step ? 'font-medium' : 'text-muted-foreground'}">{label}</span>
                </li>
            {/each}
        </ol>
    </header>

    <main class="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center p-6">
        {#if step === 0}
            <div class="text-center">
                <h1 class="font-header text-4xl font-semibold lg:text-6xl">欢迎使用 <span class="text-primary">{name}</span></h1>
                <p class="mt-4 text-muted-foreground">接下来几步会检查现有数据、选择主题颜色和面板模式。这些之后都可以在管理后台修改。</p>
            </div>
        {:else if step === 1}
            <h1 class="font-header text-2xl font-semibold">现有数据</h1>
            <p class="mt-1 mb-6 text-sm text-muted-foreground">数据库里已有的记录。从旧面板迁移过来时，可以在这里确认数据都在。</p>
            {#if dataError}
                <Alert variant="destructive">{dataError}</Alert>
            {:else if !data}
                <Spinner centered />
            {:else}
                <div class="grid gap-4 sm:grid-cols-2">
                    {#each [{ icon: User, label: '用户', value: data.users }, { icon: Layers, label: '节点', value: data.nodes }, { icon: Server, label: '服务器', value: data.servers }, { icon: Egg, label: 'Egg', value: data.eggs }] as c (c.label)}
                        {@const Icon = c.icon}
                        <Card class="flex items-center gap-4 p-5">
                            <Icon class="size-6 text-primary" />
                            <div>
                                <p class="text-sm text-muted-foreground">{c.label}</p>
                                <p class="text-2xl font-semibold">{c.value}</p>
                            </div>
                        </Card>
                    {/each}
                </div>
                {#if data.users <= 1}
                    <Alert variant="warning" class="mt-4">只有你这一个用户。如果你是从旧面板迁移过来的，请先确认数据库已经导入，再继续。</Alert>
                {/if}
            {/if}
        {:else if step === 2}
            <h1 class="font-header text-2xl font-semibold">主题颜色</h1>
            <p class="mt-1 mb-6 text-sm text-muted-foreground">选一个主色，点击后立即保存。更多颜色可以在“外观 → 主题”里设置。</p>
            {#if colorError}<Alert variant="destructive" class="mb-4">{colorError}</Alert>{/if}
            <div class="grid grid-cols-4 gap-4 lg:grid-cols-8">
                {#each colors as c (c.hex)}
                    <button
                        type="button"
                        class="group flex flex-col items-center gap-2 rounded-lg p-2 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
                        aria-pressed={primary.toLowerCase() === c.hex.toLowerCase()}
                        disabled={colorSaving !== null}
                        onclick={() => pickColor(c.hex)}
                    >
                        <span class="flex size-12 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background {primary.toLowerCase() === c.hex.toLowerCase() ? 'ring-2 ring-foreground' : ''}" style:background-color={c.hex}>
                            {#if colorSaving === c.hex}<Spinner size="sm" />{:else if primary.toLowerCase() === c.hex.toLowerCase()}<Check class="size-5" />{/if}
                        </span>
                        <span class="text-muted-foreground">{c.name}</span>
                    </button>
                {/each}
            </div>
        {:else if step === 3}
            <h1 class="font-header text-2xl font-semibold">面板模式</h1>
            <p class="mt-1 mb-6 text-sm text-muted-foreground">决定默认开启哪些功能。之后可以在“设置 → 模式”里切换。</p>
            {#if modeError}<Alert variant="destructive" class="mb-4">{modeError}</Alert>{/if}
            <div class="grid gap-4 lg:grid-cols-2">
                {#each modes as m (m.mode)}
                    {@const Icon = m.icon}
                    {@const active = app.settings?.mode === m.mode}
                    <Card class="flex flex-col gap-4 p-6 {active ? 'border-primary' : ''}">
                        <Icon class="size-8 text-primary" />
                        <div class="flex-1">
                            <p class="text-lg font-semibold">{m.title}</p>
                            <p class="mt-1 text-sm text-muted-foreground">{m.text}</p>
                        </div>
                        <Button variant={active ? 'outline' : 'default'} disabled={active || modeSaving !== undefined} loading={modeSaving === m.mode} onclick={() => pickMode(m.mode)}>
                            {#if active}<Check />已选择{:else}选择{/if}
                        </Button>
                    </Card>
                {/each}
            </div>
        {:else}
            <div class="text-center">
                <CircleCheck class="mx-auto mb-4 size-14 text-primary" />
                <h1 class="font-header text-4xl font-semibold">准备就绪</h1>
                <p class="mt-4 text-muted-foreground">点击“完成”后进入面板。接下来可以去管理后台添加节点和服务器。</p>
            </div>
        {/if}

        {#if finishError}<Alert variant="destructive" class="mt-6">{finishError}</Alert>{/if}
    </main>

    <footer class="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        {#if step === 0}
            <Button variant="ghost" disabled={busy} loading={finishing} onclick={finish}><X />跳过向导</Button>
        {:else}
            <Button variant="ghost" disabled={busy} onclick={() => step--}><ArrowLeft />上一步</Button>
        {/if}
        {#if step < steps.length - 1}
            <Button disabled={busy} onclick={() => step++}>继续<ArrowRight /></Button>
        {:else}
            <Button loading={finishing} disabled={busy} onclick={finish}><Check />完成</Button>
        {/if}
    </footer>
</div>
