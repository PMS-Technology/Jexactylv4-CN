<script lang="ts">
    import { ChevronRight, Cog, KeyRound, RefreshCw, Sparkles, User, WandSparkles } from '@lucide/svelte';
    import {
        getAIModels,
        getAIProviders,
        queryAI,
        updateAISettings,
        type AIModel,
        type AIProviderSummary,
    } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /**
     * JexpanelAI settings and console. The provider picker drives a config-driven
     * adapter layer on the backend, so switching formats does not change this page's
     * request shape; only the selected provider/model is stored.
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

    // --- Providers and models. ------------------------------------------------
    let providers = $state<AIProviderSummary[]>([]);
    let providersLoading = $state(false);
    let providersLoaded = false;
    let providerError = $state('');

    let providerId = $state(ai.provider ?? 'google_ai_studio');
    let selectedModel = $state(ai.model ?? '');
    let baseUrl = $state(ai.base_url ?? '');
    let models = $state<AIModel[]>([]);
    let modelsSource = $state('');
    let modelsLoading = $state(false);
    let modelsError = $state('');

    const providerOptions = $derived(providers.map(p => ({ value: p.id, label: p.label })));
    const currentProvider = $derived(providers.find(p => p.id === providerId) ?? null);
    const requiresKey = $derived(currentProvider?.requires_key ?? true);
    const configured = $derived(currentProvider?.configured ?? Boolean(ai.key));
    const needsKey = $derived(requiresKey && !configured);

    async function loadProviders() {
        providersLoading = true;
        providerError = '';
        try {
            providers = await getAIProviders();
            const selected = providers.find(p => p.id === providerId) ?? providers.find(p => p.selected);
            if (selected) providerId = selected.id;
            if (!selectedModel) selectedModel = selected?.default_model ?? '';
        } catch (e) {
            providerError = httpErrorToHuman(e);
        } finally {
            providersLoading = false;
        }

        if (providerId) void loadModels(false);
    }

    async function loadModels(refresh: boolean) {
        if (!providerId) return;

        modelsLoading = true;
        modelsError = '';
        try {
            const result = await getAIModels(providerId, refresh);
            models = result.models;
            modelsSource = result.source;
        } catch (e) {
            models = [];
            modelsSource = '';
            modelsError = httpErrorToHuman(e);
        } finally {
            modelsLoading = false;
        }
    }

    async function selectProvider(next: string) {
        providerId = next;
        const provider = providers.find(p => p.id === providerId);
        selectedModel = provider?.default_model ?? '';
        baseUrl = '';
        await loadModels(false);
    }

    $effect(() => {
        if (providersLoaded) return;
        providersLoaded = true;
        void loadProviders();
    });

    // --- Key. Providers use different key formats, so only require a real value. ---
    let key = $state('');
    const keyValid = $derived(key.trim().length >= 8);

    const saveKey = (event: SubmitEvent) => {
        event.preventDefault();
        if (!keyValid) return;
        void run(
            'key',
            async () => {
                await updateAISettings({ key: key.trim(), provider: providerId });
                app.updateFlags({ ai: { ...app.flags!.ai, key: true, provider: providerId } });
                key = '';
                await loadProviders();
            },
            '凭据已保存。',
        );
    };

    // --- Options. -------------------------------------------------------------
    let userAccess = $state(app.flags!.ai.user_access);
    let headersText = $state('');
    let maxTokens = $state(String(app.flags!.ai.max_tokens ?? 1024));
    let temperature = $state(String(app.flags!.ai.temperature ?? 0.7));
    let systemPrompt = $state('');

    const saveOptions = (event: SubmitEvent) => {
        event.preventDefault();
        if (key.trim() && !keyValid) return;

        let headers: Record<string, string> | undefined;
        if (headersText.trim()) {
            try {
                const parsed = JSON.parse(headersText);
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
                headers = Object.fromEntries(
                    Object.entries(parsed).map(([name, value]) => [name, String(value)]),
                );
            } catch {
                notice = { variant: 'destructive', text: '附加请求头必须是 JSON 对象。' };
                return;
            }
        }

        void run(
            'options',
            async () => {
                // Only send a key the admin actually typed: an empty string arrives as null
                // after ConvertEmptyStringsToNull and would wipe the stored one.
                await updateAISettings({
                    user_access: userAccess,
                    provider: providerId,
                    model: selectedModel.trim(),
                    base_url: baseUrl.trim(),
                    max_tokens: Number(maxTokens),
                    temperature: Number(temperature),
                    ...(headers ? { headers } : {}),
                    ...(systemPrompt.trim() ? { system_prompt: systemPrompt.trim() } : {}),
                    ...(key.trim() ? { key: key.trim() } : {}),
                });
                app.updateFlags({
                    ai: {
                        ...app.flags!.ai,
                        user_access: userAccess,
                        provider: providerId,
                        model: selectedModel.trim(),
                        base_url: baseUrl.trim(),
                        key: key.trim() ? true : ai.key,
                    },
                });
                key = '';
                await loadProviders();
            },
            '设置已保存。',
        );
    };

    // --- Console. -------------------------------------------------------------
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
                JexpanelAI 通过统一适配层接入 Anthropic、OpenAI、Gemini、OpenRouter、Ollama 等 17 种接口格式，
                可用于解释错误、提供即时支持，也能帮助管理员更好地掌控面板。
            </p>
            {#if canUpdate}
                <Button loading={busy === 'toggle'} onclick={() => setEnabled(true)}>启用 JexpanelAI</Button>
            {/if}
        </Card>
    {:else if needsKey}
        <Card class="max-w-2xl">
            <CardHeader><CardTitle class="flex items-center gap-2"><KeyRound class="size-4" />配置 JexpanelAI</CardTitle></CardHeader>
            <CardContent>
                <form class="space-y-4 text-sm" onsubmit={saveKey}>
                    <div class="space-y-1.5">
                        <Select
                            id="ai-provider-setup"
                            items={providerOptions}
                            bind:value={providerId}
                            onValueChange={selectProvider}
                            disabled={!canUpdate || providersLoading}
                            label="接口格式"
                        />
                        <p class="text-xs text-muted-foreground">
                            驱动：{currentProvider?.driver ?? '—'} · 默认模型：{currentProvider?.default_model ?? '—'}
                        </p>
                    </div>
                    <p class="text-muted-foreground">
                        填写该 Provider 的 API 密钥或令牌。{currentProvider?.label ?? '当前 Provider'} 的密钥只保存在数据库中，
                        不会回传到浏览器。
                    </p>
                    <Input
                        bind:value={key}
                        aria-label="AI API 密钥"
                        placeholder="在此填写 API 密钥"
                        autocomplete="off"
                        disabled={!canUpdate}
                        error={key && !keyValid ? '密钥至少需要 8 个字符。' : undefined}
                    />
                    {#if providerError}<p class="text-xs text-destructive">{providerError}</p>{/if}
                    {#if canUpdate}
                        <div class="flex justify-between gap-2">
                            <Button type="button" variant="ghost" loading={busy === 'toggle'} onclick={() => setEnabled(false)}>停用</Button>
                            <Button type="submit" loading={busy === 'key'} disabled={!keyValid}>保存凭据</Button>
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
                        <div class="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">
                            <span>{currentProvider?.label ?? providerId}</span>
                            <span>{selectedModel || currentProvider?.default_model || '默认模型'}</span>
                        </div>
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
                    <Alert variant="warning">JexpanelAI 的回答可能不准确或过时，请谨慎使用。</Alert>
                    <Alert>请确认所选 Provider 的配额与限流策略。上游错误会保留原始状态码和响应体，便于排查。</Alert>
                    {#if canUpdate}
                        <Card class="space-y-3 p-4 text-sm">
                            <p class="font-semibold">停用 JexpanelAI</p>
                            <p class="text-muted-foreground">停用后用户和管理员都无法使用 AI。Provider 配置与密钥会保留在数据库中。</p>
                            <div class="text-right">
                                <Button variant="destructive" loading={busy === 'toggle'} onclick={() => setEnabled(false)}>停用 JexpanelAI</Button>
                            </div>
                        </Card>
                    {/if}
                </div>
            </div>
        {:else if sub === 'settings'}
            <form onsubmit={saveOptions} class="space-y-6">
                <div class="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader><CardTitle class="flex items-center gap-2"><WandSparkles class="size-4" />接口格式</CardTitle></CardHeader>
                        <CardContent class="space-y-1.5">
                            <Select
                                aria-label="接口格式"
                                items={providerOptions}
                                bind:value={providerId}
                                onValueChange={selectProvider}
                                disabled={!canUpdate || providersLoading}
                            />
                            <p class="text-xs text-muted-foreground">
                                驱动：{currentProvider?.driver ?? '—'} · 路径：{currentProvider?.base_url || '默认'}
                            </p>
                            {#if providerError}<p class="text-xs text-destructive">{providerError}</p>{/if}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle class="flex items-center gap-2"><Cog class="size-4" />模型</CardTitle></CardHeader>
                        <CardContent class="space-y-1.5">
                            <div class="flex gap-2">
                                <Input
                                    bind:value={selectedModel}
                                    list="ai-model-list"
                                    aria-label="模型"
                                    placeholder={currentProvider?.default_model ?? '使用 Provider 默认模型'}
                                    disabled={!canUpdate}
                                    class="flex-1"
                                />
                                <datalist id="ai-model-list">
                                    {#each models as model (model.id)}
                                        <option value={model.id}>{model.name}</option>
                                    {/each}
                                </datalist>
                                <Button
                                    type="button"
                                    variant="outline"
                                    aria-label="同步模型列表"
                                    loading={modelsLoading}
                                    disabled={!canUpdate || !currentProvider?.model_sync}
                                    onclick={() => loadModels(true)}
                                >
                                    <RefreshCw class="size-4" />
                                </Button>
                            </div>
                            <p class="text-xs text-muted-foreground">
                                {#if modelsError}
                                    <span class="text-destructive">{modelsError}</span>
                                {:else if modelsSource === 'live'}
                                    已从上游同步 {models.length} 个模型。
                                {:else if modelsSource === 'cache'}
                                    使用缓存的 {models.length} 个模型。
                                {:else if models.length}
                                    使用内置的 {models.length} 个模型。
                                {:else}
                                    可直接填写模型 ID，或点击同步按钮获取列表。
                                {/if}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle class="flex items-center gap-2"><WandSparkles class="size-4" />Base URL</CardTitle></CardHeader>
                        <CardContent class="space-y-1.5">
                            <Input
                                bind:value={baseUrl}
                                aria-label="Base URL"
                                placeholder={currentProvider?.base_url || '留空使用 Provider 默认地址'}
                                disabled={!canUpdate}
                                autocomplete="off"
                            />
                            <p class="text-xs text-muted-foreground">自建代理或本地网关可在此覆盖默认地址。</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle class="flex items-center gap-2"><KeyRound class="size-4" />更换凭据</CardTitle></CardHeader>
                        <CardContent class="space-y-1.5">
                            <Input
                                bind:value={key}
                                aria-label="新的 API 密钥"
                                placeholder="留空则保留当前密钥"
                                autocomplete="off"
                                disabled={!canUpdate}
                                error={key && !keyValid ? '密钥至少需要 8 个字符。' : undefined}
                            />
                            <p class="text-xs text-muted-foreground">
                                当前状态：{!requiresKey ? '无需凭据' : configured ? '已配置' : '未配置'}。
                                {#if requiresKey}切换 Provider 后请填写对应凭据。{:else}该 Provider 不需要 API 密钥。{/if}
                            </p>
                        </CardContent>
                    </Card>

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
                        <CardHeader><CardTitle class="flex items-center gap-2"><Cog class="size-4" />生成参数</CardTitle></CardHeader>
                        <CardContent class="grid grid-cols-2 gap-3">
                            <label class="space-y-1 text-xs text-muted-foreground">
                                最大 Token
                                <Input type="number" min={1} max={200000} bind:value={maxTokens} disabled={!canUpdate} />
                            </label>
                            <label class="space-y-1 text-xs text-muted-foreground">
                                温度
                                <Input type="number" min={0} max={2} step={0.1} bind:value={temperature} disabled={!canUpdate} />
                            </label>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle class="flex items-center gap-2"><Cog class="size-4" />高级</CardTitle></CardHeader>
                    <CardContent class="grid gap-3 lg:grid-cols-2">
                        <label class="space-y-1 text-xs text-muted-foreground">
                            附加请求头（JSON）
                            <textarea
                                bind:value={headersText}
                                disabled={!canUpdate}
                                rows="3"
                                placeholder={JSON.stringify({ 'X-Custom-Header': 'value' })}
                                class="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                            ></textarea>
                        </label>
                        <label class="space-y-1 text-xs text-muted-foreground">
                            系统提示（留空沿用默认）
                            <textarea
                                bind:value={systemPrompt}
                                disabled={!canUpdate}
                                rows="3"
                                placeholder="You are JexpanelAI…"
                                class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                            ></textarea>
                        </label>
                    </CardContent>
                </Card>

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
