<script lang="ts">
    import { CheckCircle2, DoorOpen, KeyRound, Lock, Puzzle, ShieldHalf, Star, Trash2, UserPlus } from '@lucide/svelte';
    import type { Component } from 'svelte';
    import { setAuthModule, updateAuthSetting, type AuthModuleName, type AuthSettingGroup } from '$lib/api/admin/auth';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /**
     * Authentication, ported from AuthContainer.tsx and its cards. Switches and selects
     * save on change like the legacy page; text fields save with a button, because the
     * legacy inputs saved on every keystroke and stored half-typed OAuth secrets.
     */
    const auth = $derived(app.flags!.auth);
    const canUpdate = $derived(app.can('auth.update'));

    // Per-card status: which card is saving, and which one just saved.
    let saving = $state<string | null>(null);
    let savedCard = $state<string | null>(null);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);
    // A switch flips its own state on click; remounting puts it back after a failed save.
    let failures = $state(0);

    function patchAuth(mutate: (a: typeof auth) => void) {
        const next = structuredClone($state.snapshot(app.flags!.auth));
        mutate(next);
        app.updateFlags({ auth: next });
    }

    /** Returns whether every value saved. */
    async function save(card: string, group: AuthSettingGroup, values: Record<string, string | number | boolean>, apply: (a: typeof auth) => void) {
        saving = card;
        savedCard = null;
        notice = null;
        try {
            for (const [key, value] of Object.entries(values)) {
                await updateAuthSetting(group, key, value);
            }
            patchAuth(apply);
            savedCard = card;
            setTimeout(() => savedCard === card && (savedCard = null), 2000);

            return true;
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
            failures++;

            return false;
        } finally {
            saving = null;
        }
    }

    // --- Security.
    let attempts = $state(String(app.flags!.auth.security.attempts ?? 3));
    // AbstractLoginController casts this to int and locks out at that many failures.
    const attemptsValid = $derived(/^\d+$/.test(attempts.trim()) && Number(attempts) >= 1);

    // --- Onboarding / jGuard text fields.
    let onboardingContent = $state(app.flags!.auth.modules.onboarding.content ?? '');
    let jguardDelay = $state(String(app.flags!.auth.modules.jguard.delay ?? 0));
    // JGuardService::delay() takes whole minutes; 0 turns the delay off.
    const delayValid = $derived(/^\d+$/.test(jguardDelay.trim()));

    // --- OAuth secrets: write-only, the panel only reports whether one is set.
    const secrets = $state({
        discord: { client_id: '', client_secret: '' },
        google: { client_id: '', client_secret: '' },
    });

    function saveSecrets(provider: 'discord' | 'google') {
        const values = Object.fromEntries(Object.entries(secrets[provider]).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
        if (!Object.keys(values).length) return;

        void save(provider, provider, values, a => {
            if (values.client_id) a.modules[provider].clientId = true;
            if (values.client_secret) a.modules[provider].clientSecret = true;
        }).then(ok => {
            // Keep what was typed if the save failed, so it can be retried.
            if (ok) secrets[provider] = { client_id: '', client_secret: '' };
        });
    }

    // --- Modules.
    const catalogue: { name: AuthModuleName; title: string; icon: Component<any>; description: string; recommended?: string }[] = [
        {
            name: 'onboarding',
            title: 'Onboarding',
            icon: DoorOpen,
            description: '让通过 OAuth 注册的用户补充设置用户名和密码。',
            recommended: '强烈建议和 OAuth 模块一起使用，否则用户可能没有密码。',
        },
        { name: 'jguard', title: 'jGuard', icon: ShieldHalf, description: '识别小号注册，并可以给新用户加一段访问延迟。' },
        { name: 'discord', title: 'Discord 登录', icon: KeyRound, description: '允许用户通过 Discord 账号注册和登录。' },
        { name: 'google', title: 'Google 登录', icon: KeyRound, description: '允许用户通过 Google 账号注册和登录。' },
    ];
    const available = $derived(catalogue.filter(m => !auth.modules[m.name].enabled));

    let addOpen = $state(false);
    let toggling = $state<AuthModuleName | null>(null);
    let addError = $state('');

    async function enableModule(name: AuthModuleName) {
        toggling = name;
        addError = '';
        try {
            await setAuthModule(name, true);
            patchAuth(a => (a.modules[name].enabled = true));
            if (available.length === 0) addOpen = false;
        } catch (e) {
            addError = httpErrorToHuman(e);
        } finally {
            toggling = null;
        }
    }

    let removing = $state<AuthModuleName | null>(null);
    let removeOpen = $state(false);

    async function disableModule() {
        if (!removing) return;
        const name = removing;
        await setAuthModule(name, false);
        patchAuth(a => (a.modules[name].enabled = false));
    }

    const selectClass =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

{#snippet status(card: string)}
    {#if saving === card}
        <Spinner size="sm" />
    {:else if savedCard === card}
        <CheckCircle2 class="size-4 text-success" aria-label="已保存" />
    {/if}
{/snippet}

{#snippet removeButton(name: AuthModuleName, title: string)}
    {#if app.can('auth.delete')}
        <button
            type="button"
            class="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="移除模块 {title}"
            onclick={() => {
                removing = name;
                removeOpen = true;
            }}
        >
            <Trash2 class="size-4" />
        </button>
    {/if}
{/snippet}

{#snippet oauthCard(provider: 'discord' | 'google', title: string)}
    {@const flags = auth.modules[provider]}
    <Card>
        <CardHeader>
            <div class="flex items-center justify-between gap-2">
                <CardTitle class="flex items-center gap-2"><KeyRound class="size-4" />{title}</CardTitle>
                <div class="flex items-center gap-1">{@render status(provider)}{@render removeButton(provider, title)}</div>
            </div>
        </CardHeader>
        <CardContent>
            <form
                class="space-y-4"
                onsubmit={e => {
                    e.preventDefault();
                    saveSecrets(provider);
                }}
            >
                {#each [['client_id', 'Client ID', flags.clientId], ['client_secret', 'Client Secret', flags.clientSecret]] as const as [key, label, isSet] (key)}
                    <div class="space-y-1.5">
                        <Label for="{provider}-{key}">
                            {label}
                            {#if !isSet}<span class="ml-1 text-destructive" title="尚未设置">*</span>{/if}
                        </Label>
                        <Input
                            id="{provider}-{key}"
                            type="password"
                            autocomplete="off"
                            bind:value={secrets[provider][key]}
                            placeholder={isSet ? '已设置，输入新值可覆盖' : '尚未设置'}
                            disabled={!canUpdate}
                        />
                    </div>
                {/each}
                {#if provider === 'discord'}
                    <p class="text-xs text-muted-foreground">
                        在 <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" class="text-primary hover:underline">Discord 开发者门户</a> 获取。
                    </p>
                {/if}
                <Alert>
                    回调地址：
                    <code class="mt-1 block rounded bg-muted px-1.5 py-1 font-mono text-xs break-all text-foreground">{window.location.origin}/auth/modules/{provider}/authenticate</code>
                </Alert>
                {#if canUpdate}
                    <div class="flex justify-end">
                        <Button
                            type="submit"
                            size="sm"
                            loading={saving === provider}
                            disabled={!secrets[provider].client_id.trim() && !secrets[provider].client_secret.trim()}
                        >
                            保存
                        </Button>
                    </div>
                {/if}
            </form>
        </CardContent>
    </Card>
{/snippet}

<svelte:head>
    <title>认证 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="认证" description="配置和管理用户的注册与登录流程。">
        {#if app.can('auth.create') && available.length}
            <Button onclick={() => (addOpen = true)}><Puzzle />添加模块</Button>
        {/if}
    </PageHeader>

    {#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <!-- Registration -->
        <Card>
            <CardHeader>
                <div class="flex items-center justify-between">
                    <CardTitle class="flex items-center gap-2"><UserPlus class="size-4" />注册</CardTitle>
                    {@render status('registration')}
                </div>
            </CardHeader>
            <CardContent class="space-y-3">
                <label class="flex items-center justify-between gap-2 text-sm">
                    允许用户注册
                    {#key failures}
                        <Switch
                            checked={auth.registration.enabled}
                            aria-label="允许用户注册"
                            disabled={!canUpdate || saving !== null}
                            onCheckedChange={v => save('registration', 'registration', { enabled: v }, a => (a.registration.enabled = v))}
                        />
                    {/key}
                </label>
                <p class="text-xs text-muted-foreground">控制用户能否通过内置页面注册。</p>
                {#if !auth.registration.enabled}
                    <Alert variant="warning">注册已关闭，Discord 等 OAuth 模块只能用于登录，不能注册新账号。</Alert>
                {/if}
            </CardContent>
        </Card>

        <!-- Security -->
        <Card>
            <CardHeader>
                <div class="flex items-center justify-between">
                    <CardTitle class="flex items-center gap-2"><Lock class="size-4" />安全</CardTitle>
                    {@render status('security')}
                </div>
            </CardHeader>
            <CardContent class="space-y-4">
                <div class="space-y-1.5">
                    <label class="flex items-center justify-between gap-2 text-sm">
                        强制两步验证
                        {#key failures}
                            <Switch
                                checked={auth.security.force2fa}
                                aria-label="强制两步验证"
                                disabled={!canUpdate || saving !== null}
                                onCheckedChange={v => save('security', 'security', { force2fa: v }, a => (a.security.force2fa = v))}
                            />
                        {/key}
                    </label>
                    <p class="text-xs text-muted-foreground">开启后所有用户都必须启用两步验证。</p>
                    {#if !auth.security.force2fa && !app.user?.useTotp}
                        <!-- RequireTwoFactorAuthentication rejects every admin API call from an
                             account without TOTP once this is on, including the call to undo it. -->
                        <Alert variant="warning">
                            你的账号还没有启用两步验证。开启后，你在启用之前将无法使用管理后台（包括关闭此选项）。
                        </Alert>
                    {/if}
                </div>
                <form
                    class="space-y-1.5"
                    onsubmit={e => {
                        e.preventDefault();
                        if (attemptsValid) void save('security', 'security', { attempts: Number(attempts) }, a => (a.security.attempts = Number(attempts)));
                    }}
                >
                    <Label for="auth-attempts">登录尝试次数上限</Label>
                    <div class="flex gap-2">
                        <Input
                            id="auth-attempts"
                            bind:value={attempts}
                            inputmode="numeric"
                            disabled={!canUpdate}
                            error={attemptsValid ? undefined : '请输入不小于 1 的整数。'}
                        />
                        {#if canUpdate}
                            <Button type="submit" size="sm" class="h-9" disabled={!attemptsValid || Number(attempts) === auth.security.attempts}>保存</Button>
                        {/if}
                    </div>
                    <p class="text-xs text-muted-foreground">连续登录失败达到此次数后会被限流。</p>
                </form>
            </CardContent>
        </Card>

        {#if auth.modules.onboarding.enabled}
            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between gap-2">
                        <CardTitle class="flex items-center gap-2"><DoorOpen class="size-4" />Onboarding</CardTitle>
                        <div class="flex items-center gap-1">{@render status('onboarding')}{@render removeButton('onboarding', 'Onboarding')}</div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form
                        class="space-y-3"
                        onsubmit={e => {
                            e.preventDefault();
                            void save('onboarding', 'onboarding', { content: onboardingContent.trim() }, a => (a.modules.onboarding.content = onboardingContent.trim()));
                        }}
                    >
                        <div class="space-y-1.5">
                            <Label for="onboarding-content">引导说明</Label>
                            <Input id="onboarding-content" bind:value={onboardingContent} disabled={!canUpdate} placeholder="可以随时在“账号”页修改这些信息。" />
                            <p class="text-xs text-muted-foreground">显示在引导弹窗里的说明文字，可以留空。</p>
                        </div>
                        {#if auth.security.force2fa}
                            <Alert>已开启“强制两步验证”，引导弹窗会提示用户必须先启用两步验证。</Alert>
                        {/if}
                        {#if canUpdate}
                            <div class="flex justify-end"><Button type="submit" size="sm" loading={saving === 'onboarding'}>保存</Button></div>
                        {/if}
                    </form>
                </CardContent>
            </Card>
        {/if}

        {#if auth.modules.jguard.enabled}
            <Card>
                <CardHeader>
                    <div class="flex items-center justify-between gap-2">
                        <CardTitle class="flex items-center gap-2"><ShieldHalf class="size-4" />jGuard</CardTitle>
                        <div class="flex items-center gap-1">{@render status('jguard')}{@render removeButton('jguard', 'jGuard')}</div>
                    </div>
                </CardHeader>
                <CardContent class="space-y-4">
                    <form
                        class="space-y-1.5"
                        onsubmit={e => {
                            e.preventDefault();
                            if (delayValid) void save('jguard', 'jguard', { delay: Number(jguardDelay) }, a => (a.modules.jguard.delay = Number(jguardDelay)));
                        }}
                    >
                        <Label for="jguard-delay">新账号访问延迟（分钟）</Label>
                        <div class="flex gap-2">
                            <Input id="jguard-delay" bind:value={jguardDelay} inputmode="numeric" disabled={!canUpdate} error={delayValid ? undefined : '请输入非负整数。'} />
                            {#if canUpdate}
                                <Button type="submit" size="sm" class="h-9" disabled={!delayValid}>保存</Button>
                            {/if}
                        </div>
                        <p class="text-xs text-muted-foreground">新注册的用户要等待这么久才能进入面板，用于防止机器人批量注册。0 表示不延迟。</p>
                    </form>
                    <div class="space-y-1.5">
                        <Label for="jguard-sensitivity">小号识别灵敏度</Label>
                        <select
                            id="jguard-sensitivity"
                            class={selectClass}
                            value={auth.modules.jguard.sensitivity ?? 'medium'}
                            disabled={!canUpdate || saving !== null}
                            onchange={e => {
                                const v = e.currentTarget.value as 'low' | 'medium' | 'high';
                                void save('jguard', 'jguard', { sensitivity: v }, a => (a.modules.jguard.sensitivity = v));
                            }}
                        >
                            <option value="low">低</option>
                            <option value="medium">中</option>
                            <option value="high">高</option>
                        </select>
                        <p class="text-xs text-muted-foreground">
                            控制 jGuard 多快拦截近期注册过或多次登录失败的 IP。灵敏度越高拦截越积极，但也可能影响共用 IP 的正常用户（如学校、公司网络）。
                        </p>
                    </div>
                </CardContent>
            </Card>
        {/if}

        {#if auth.modules.discord.enabled}{@render oauthCard('discord', 'Discord 登录')}{/if}
        {#if auth.modules.google.enabled}{@render oauthCard('google', 'Google 登录')}{/if}
    </div>
</div>

<Dialog bind:open={addOpen} title="添加模块" class="max-w-lg">
    <div class="space-y-3">
        {#if addError}<Alert variant="destructive">{addError}</Alert>{/if}
        {#each available as m (m.name)}
            {@const Icon = m.icon}
            <div class="rounded-lg border border-border p-4">
                <div class="flex items-start gap-3">
                    <Icon class="mt-0.5 size-5 shrink-0 text-primary" />
                    <div class="flex-1 text-sm">
                        <p class="font-semibold">{m.title}</p>
                        <p class="mt-1 text-muted-foreground">{m.description}</p>
                        {#if m.recommended}
                            <p class="mt-2 flex items-start gap-1.5 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                                <Star class="mt-0.5 size-3.5 shrink-0 text-warning" />{m.recommended}
                            </p>
                        {/if}
                    </div>
                    <Button size="sm" loading={toggling === m.name} disabled={toggling !== null} onclick={() => enableModule(m.name)}>添加</Button>
                </div>
            </div>
        {:else}
            <p class="text-sm text-muted-foreground">所有模块都已添加。</p>
        {/each}
    </div>
</Dialog>

<ConfirmDialog bind:open={removeOpen} title="确认移除模块" confirmLabel="移除" onConfirm={disableModule}>
    <p>确定移除 <strong>{catalogue.find(m => m.name === removing)?.title}</strong> 模块吗？已保存的配置会保留，重新添加后仍然有效。</p>
</ConfirmDialog>
