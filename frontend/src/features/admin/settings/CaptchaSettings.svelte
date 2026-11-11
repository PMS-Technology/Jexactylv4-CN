<script lang="ts">
    import { ExternalLink, KeyRound, ShieldCheck } from '@lucide/svelte';
    import { CAPTCHA_PROVIDERS, updateCaptchaSettings, type CaptchaSettingsInput } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import type { CaptchaProvider } from '$lib/utils/recaptcha';
    import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '$lib/ui';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';

    const canUpdate = $derived(app.can('settings.update'));
    const config = app.settings?.captcha;

    const emptyKeys = (): Record<CaptchaProvider, string> => ({
        recaptcha: '',
        hcaptcha: '',
        turnstile: '',
        geetest: '',
        corptcha: '',
    });

    const emptySecretFlags = (): Record<CaptchaProvider, boolean> => ({
        recaptcha: false,
        hcaptcha: false,
        turnstile: false,
        geetest: false,
        corptcha: false,
    });

    const providerMeta: Record<
        CaptchaProvider,
        { label: string; siteKey: string; secretKey: string; console: string; help: string }
    > = {
        recaptcha: {
            label: 'Google reCAPTCHA',
            siteKey: 'Site key',
            secretKey: 'Secret key',
            console: 'https://www.google.com/recaptcha/admin',
            help: '在 Google reCAPTCHA 管理台创建 v2 Invisible 类型的站点。',
        },
        hcaptcha: {
            label: 'hCaptcha',
            siteKey: 'Site key',
            secretKey: 'Secret key',
            console: 'https://dashboard.hcaptcha.com/sites',
            help: '在 hCaptcha 控制台创建站点，复制 Sitekey 与 Secret。',
        },
        turnstile: {
            label: 'Cloudflare Turnstile',
            siteKey: 'Site key',
            secretKey: 'Secret key',
            console: 'https://dash.cloudflare.com/?to=/:account/turnstile',
            help: '在 Cloudflare 控制台添加 Turnstile 站点，支持隐形模式。',
        },
        geetest: {
            label: '极验 Geetest',
            siteKey: '验证 ID（captcha_id）',
            secretKey: '验证密钥（captcha_key）',
            console: 'https://console.geetest.com/',
            help: '使用极验行为验证 4.0，站点密钥对应验证 ID，服务端密钥对应验证密钥。',
        },
        corptcha: {
            label: 'Corptcha',
            siteKey: 'Site ID（cpt_ 开头）',
            secretKey: 'Secret',
            console: 'https://dash.corptcha.com',
            help: '在 Corptcha 控制台「站点管理」创建站点并生成 Secret。',
        },
    };

    let enabled = $state(config?.enabled ?? false);
    let provider = $state<CaptchaProvider>(config?.provider ?? 'recaptcha');
    let siteKeys = $state<Record<CaptchaProvider, string>>({ ...emptyKeys(), ...(config?.siteKeys ?? {}) });
    let secretKeys = $state<Record<CaptchaProvider, string>>(emptyKeys());
    let hasSecret = $state<Record<CaptchaProvider, boolean>>({ ...emptySecretFlags(), ...(config?.hasSecret ?? {}) });
    let apiBase = $state(config?.apiBase ?? 'https://cpt-api.25y.cn');

    let saving = $state(false);
    let saved = $state(false);
    let error = $state('');

    const selected = $derived(providerMeta[provider]);
    const providerOptions = $derived(
        CAPTCHA_PROVIDERS.map(id => ({ value: id, label: providerMeta[id].label })),
    );
    const selectedReady = $derived(
        Boolean(siteKeys[provider]?.trim()) && (hasSecret[provider] || Boolean(secretKeys[provider]?.trim())),
    );

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (saving) return;

        saving = true;
        saved = false;
        error = '';
        try {
            const input: CaptchaSettingsInput = { enabled, provider, siteKeys, secretKeys, apiBase };
            await updateCaptchaSettings(input);

            const nextHasSecret = { ...hasSecret };
            for (const key of CAPTCHA_PROVIDERS) {
                if (secretKeys[key]?.trim()) nextHasSecret[key] = true;
            }

            hasSecret = nextHasSecret;
            secretKeys = emptyKeys();
            app.updateSettings({
                captcha: {
                    enabled,
                    provider,
                    siteKey: siteKeys[provider],
                    scriptUrl: config?.scriptUrl ?? '',
                    apiBase,
                    siteKeys: { ...siteKeys },
                    hasSecret: { ...nextHasSecret },
                },
            });
            saved = true;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<svelte:head>
    <title>验证码 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<form class="space-y-6" onsubmit={submit}>
    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {:else if saved}
        <Alert variant="success">验证码设置已保存。</Alert>
    {/if}

    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2"><ShieldCheck class="size-4" />人机验证</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
            <label class="flex items-center justify-between gap-3 text-sm">
                <span>
                    <span class="font-medium">启用验证码</span>
                    <span class="mt-0.5 block text-xs text-muted-foreground">
                        启用后，登录、注册、第三方登录和找回密码会要求完成所选提供商的验证。
                    </span>
                </span>
                <Switch bind:checked={enabled} aria-label="启用验证码" disabled={!canUpdate} />
            </label>

            <div class="space-y-1.5">
                <Select
                    id="captcha-provider"
                    items={providerOptions}
                    bind:value={provider}
                    disabled={!canUpdate}
                    label="提供商"
                />
                <p class="text-xs text-muted-foreground">
                    当前选择：{selected.label} · <a href={selected.console} target="_blank" rel="noreferrer" class="text-primary hover:underline">打开控制台 <ExternalLink class="inline size-3" /></a>
                </p>
            </div>

            {#if enabled && !selectedReady}
                <Alert variant="destructive">
                    当前提供商还缺少站点密钥或服务端密钥。请填写并保存后再启用验证码，否则相关登录接口会拒绝请求。
                </Alert>
            {/if}
        </CardContent>
    </Card>

    <div class="grid gap-6 lg:grid-cols-2">
        {#each CAPTCHA_PROVIDERS as id (id)}
            {@const meta = providerMeta[id]}
            <Card class={id === provider ? 'ring-2 ring-primary/40' : ''}>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2">
                        <KeyRound class="size-4" />{meta.label}
                        {#if id === provider}<span class="text-xs font-normal text-primary">当前使用</span>{/if}
                        {#if hasSecret[id]}<span class="text-xs font-normal text-muted-foreground">已配置密钥</span>{/if}
                    </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                    <div class="space-y-1.5">
                        <label for="captcha-{id}-site" class="text-xs font-medium">{meta.siteKey}</label>
                        <Input
                            id="captcha-{id}-site"
                            bind:value={siteKeys[id]}
                            autocomplete="off"
                            spellcheck="false"
                            disabled={!canUpdate}
                        />
                    </div>
                    <div class="space-y-1.5">
                        <label for="captcha-{id}-secret" class="text-xs font-medium">{meta.secretKey}</label>
                        <Input
                            id="captcha-{id}-secret"
                            type="password"
                            bind:value={secretKeys[id]}
                            placeholder={hasSecret[id] ? '已保存，留空保持不变' : '尚未配置'}
                            autocomplete="new-password"
                            disabled={!canUpdate}
                        />
                    </div>
                    {#if id === 'corptcha'}
                        <div class="space-y-1.5">
                            <label for="captcha-corptcha-api" class="text-xs font-medium">API 地址</label>
                            <Input id="captcha-corptcha-api" bind:value={apiBase} type="url" disabled={!canUpdate} />
                        </div>
                    {/if}
                    <p class="text-xs text-muted-foreground">{meta.help}</p>
                </CardContent>
            </Card>
        {/each}
    </div>

    <div class="flex items-center justify-between gap-4">
        <p class="text-xs text-muted-foreground">验证码设置保存后立即生效，无需重启面板。</p>
        {#if canUpdate}
            <Button type="submit" loading={saving} disabled={enabled && !selectedReady}>保存更改</Button>
        {/if}
    </div>
</form>
