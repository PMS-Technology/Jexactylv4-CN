<script lang="ts">
    import { ChevronRight, Cog, ExternalLink, KeyRound, Sparkles, User, WandSparkles } from '@lucide/svelte';
    import { queryAI, updateAISettings } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /**
     * JexpanelAI, ported from AIRouter.tsx and its children: enable card, API key setup,
     * the query console and the options tab. The legacy pages reloaded the document after
     * every toggle and key change; here the flags are patched in place.
     */
    const sub = $derived(router.pathname.replace(/^\/admin\/ai\/?/, '').replace(/\/+$/, ''));
    const ai = $derived(app.flags!.ai);
    const canUpdate = $derived(app.can('ai.update'));

    let busy = $state<string | null>(null);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function run(key: string, task: () => Promise<void>, success?: string) {
        busy = key;
        notice = null;
        try {
            await task();
            if (success) notice = { variant: 'success', text: success };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            busy = null;
        }
    }

    const setEnabled = (enabled: boolean) =>
        run('toggle', async () => {
            await updateAISettings({ enabled });
            app.updateFlags({ ai: { ...app.flags!.ai, enabled } });
        });

    // --- Key. Gemini keys are 39 characters; the legacy dialog accepted 31–59.
    let key = $state('');
    const keyValid = $derived(key.trim().length > 30 && key.trim().length < 60);

    const saveKey = (event: SubmitEvent) => {
        event.preventDefault();
        if (!keyValid) return;
        void run(
            'key',
            async () => {
                await updateAISettings({ key: key.trim() });
                app.updateFlags({ ai: { ...app.flags!.ai, key: true } });
                key = '';
            },
            'API 密钥已保存。',
        );
    };

    // --- Options.
    let userAccess = $state(app.flags!.ai.user_access);

    const saveOptions = (event: SubmitEvent) => {
        event.preventDefault();
        if (key.trim() && !keyValid) return;
        void run(
            'options',
            async () => {
                // Only send a key the admin actually typed: an empty string arrives as null
                // after ConvertEmptyStringsToNull and would wipe the stored one.
                await updateAISettings({ user_access: userAccess, ...(key.trim() ? { key: key.trim() } : {}) });
                app.updateFlags({ ai: { ...app.flags!.ai, user_access: userAccess } });
                key = '';
            },
            '设置已保存。',
        );
    };

    // --- Console.
    let prompt = $state('');
    let answer = $state<string | null>(null);
    let asking = $state(false);
    let askError = $state('');

    async function ask(event: SubmitEvent) {
        event.preventDefault();
        // QueryRequest requires at least 3 characters; the legacy console sent anything over 1.
        if (prompt.trim().length < 3 || asking) return;

        asking = true;
        answer = null;
        askError = '';
        try {
            answer = await queryAI(prompt.trim());
        } catch (e) {
            askError = httpErrorToHuman(e);
        } finally {
            asking = false;
        }
    }
</script>

<svelte:head>
    <title>JexpanelAI | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="JexpanelAI" description="用 AI 帮助用户理解错误、提供即时支持，并协助管理员管理面板。" />

    {#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

    {#if !ai.enabled}
        <Card class="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <WandSparkles class="size-8 shrink-0 text-primary" />
            <p class="flex-1 text-sm text-muted-foreground">
                JexpanelAI 使用 Google Gemini 处理请求，可以为用户解释错误、提供即时支持，也能帮助管理员更好地掌控面板。
            </p>
            {#if canUpdate}
                <Button loading={busy === 'toggle'} onclick={() => setEnabled(true)}>启用 JexpanelAI</Button>
            {/if}
        </Card>
    {:else if !ai.key}
        <Card class="max-w-lg">
            <CardHeader><CardTitle class="flex items-center gap-2"><KeyRound class="size-4" />配置 JexpanelAI</CardTitle></CardHeader>
            <CardContent>
                <form class="space-y-3 text-sm" onsubmit={saveKey}>
                    <p class="text-muted-foreground">
                        使用 JexpanelAI 需要一个 Google Gemini API 密钥，可以在
                        <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" class="inline-flex items-center gap-0.5 text-primary underline-offset-4 hover:underline">
                            AI Studio <ExternalLink class="size-3" />
                        </a>
                        获取。
                    </p>
                    <Input
                        bind:value={key}
                        aria-label="Gemini API 密钥"
                        placeholder="在此填写 API 密钥"
                        autocomplete="off"
                        disabled={!canUpdate}
                        error={key && !keyValid ? '请输入有效的 Google AI 密钥。' : undefined}
                    />
                    {#if canUpdate}
                        <div class="flex justify-between gap-2">
                            <Button type="button" variant="ghost" loading={busy === 'toggle'} onclick={() => setEnabled(false)}>停用</Button>
                            <Button type="submit" loading={busy === 'key'} disabled={!keyValid}>保存密钥</Button>
                        </div>
                    {/if}
                </form>
            </CardContent>
        </Card>
    {:else}
        <nav class="mb-6 flex gap-1 border-b border-border" aria-label="AI 分类">
            {#each [{ path: '', name: '常规', icon: Sparkles }, { path: 'settings', name: '选项', icon: Cog }] as tab (tab.path)}
                {@const Icon = tab.icon}
                <Link
                    href={tab.path ? `/admin/ai/${tab.path}` : '/admin/ai'}
                    end
                    class="-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                    activeClass="border-primary! text-foreground font-medium"
                >
                    <Icon class="size-4" />{tab.name}
                </Link>
            {/each}
        </nav>

        {#if sub === ''}
            <div class="grid gap-4 lg:grid-cols-5">
                <div class="lg:col-span-3">
                    <div class="flex min-h-[50vh] flex-col overflow-hidden rounded-lg border border-border bg-zinc-950 text-zinc-100">
                        <div class="flex-1 overflow-auto p-4 font-mono text-sm">
                            {#if asking}
                                <span class="inline-flex items-center gap-2 text-zinc-400"><Spinner size="sm" />思考中…</span>
                            {:else if askError}
                                <p class="text-red-400">{askError}</p>
                            {:else if answer !== null}
                                <Sparkles class="mb-2 size-4 text-primary" />
                                <p class="break-words whitespace-pre-wrap">{answer}</p>
                            {:else}
                                <span class="inline-flex items-center gap-2 text-zinc-500"><Sparkles class="size-4" />等待提问</span>
                            {/if}
                        </div>
                        <form class="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900 px-4 py-2" onsubmit={ask}>
                            <ChevronRight class="size-4 shrink-0 text-zinc-400" />
                            <input
                                bind:value={prompt}
                                aria-label="向 JexpanelAI 提问"
                                placeholder="向 JexpanelAI 提问，按回车发送"
                                disabled={!app.can('ai.read') || asking}
                                class="h-9 flex-1 bg-transparent font-mono text-sm placeholder:text-zinc-500 focus:outline-none"
                            />
                        </form>
                    </div>
                </div>
                <div class="space-y-4 lg:col-span-2">
                    <Alert variant="warning">JexpanelAI 依赖 Google Gemini 模型，回答可能不准确或过时，请谨慎使用。</Alert>
                    <Alert>Gemini 公共 API 有请求频率限制。如果频繁被限流，可能需要升级你的授权。</Alert>
                    {#if canUpdate}
                        <Card class="space-y-3 p-4 text-sm">
                            <p class="font-semibold">停用 JexpanelAI</p>
                            <p class="text-muted-foreground">停用后用户和管理员都无法使用 AI。API 密钥会保留在数据库中。</p>
                            <div class="text-right">
                                <Button variant="destructive" loading={busy === 'toggle'} onclick={() => setEnabled(false)}>停用 JexpanelAI</Button>
                            </div>
                        </Card>
                    {/if}
                </div>
            </div>
        {:else if sub === 'settings'}
            <form onsubmit={saveOptions} class="space-y-6">
                <div class="grid gap-4 lg:grid-cols-4">
                    <Card>
                        <CardHeader><CardTitle class="flex items-center gap-2"><User class="size-4" />用户端 AI</CardTitle></CardHeader>
                        <CardContent class="space-y-1.5">
                            <label class="flex items-center justify-between gap-2 text-sm">
                                允许普通用户使用 AI
                                <Switch bind:checked={userAccess} aria-label="允许普通用户使用 AI" disabled={!canUpdate} />
                            </label>
                            <p class="text-xs text-muted-foreground">开启后，普通用户也能和管理员一样使用 JexpanelAI。</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle class="flex items-center gap-2"><KeyRound class="size-4" />更换 API 密钥</CardTitle></CardHeader>
                        <CardContent class="space-y-1.5">
                            <Input
                                bind:value={key}
                                aria-label="新的 Gemini API 密钥"
                                placeholder="留空则保留当前密钥"
                                autocomplete="off"
                                disabled={!canUpdate}
                                error={key && !keyValid ? '请输入有效的 Google AI 密钥。' : undefined}
                            />
                            <p class="text-xs text-muted-foreground">遇到“API 密钥无效”时，可以在这里填写新密钥。</p>
                        </CardContent>
                    </Card>
                </div>
                {#if canUpdate}
                    <div class="flex justify-end">
                        <Button type="submit" loading={busy === 'options'} disabled={Boolean(key.trim()) && !keyValid}>保存更改</Button>
                    </div>
                {/if}
            </form>
        {:else}
            <NotFound backTo="/admin/ai" />
        {/if}
    {/if}
</div>
