<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { Mail, Send, Server, User } from '@lucide/svelte';
    import {
        getMailSettings,
        sendMailTestEmail,
        updateMailSettings,
        type MailDriver,
        type MailEncryption,
    } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Spinner } from '$lib/ui';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * The mail settings of the panel.
     *
     * They live in the database instead of the environment, so a panel can
     * change where its mail goes without a restart. The password is never sent
     * back to the browser; an empty field keeps the stored one.
     */
    const canUpdate = $derived(app.can('settings.update'));

    const settings = createQuery(() => ({ queryKey: ['admin', 'mail'], queryFn: getMailSettings }));

    let enabled = $state(false);
    let driver = $state<MailDriver>('smtp');
    let host = $state('');
    let port = $state('25');
    let encryption = $state<MailEncryption>('none');
    let username = $state('');
    let password = $state('');
    let fromAddress = $state('');
    let fromName = $state('');
    let hasPassword = $state(false);

    let saving = $state(false);
    let saved = $state(false);
    let error = $state('');

    let testAddress = $state('');
    let testing = $state(false);
    let tested = $state(false);
    let testError = $state('');

    // Fill the form with what the panel has stored, once it has been loaded.
    $effect(() => {
        const data = settings.data;
        if (!data) return;

        enabled = data.enabled;
        driver = data.driver;
        host = data.host;
        port = String(data.port);
        encryption = data.encryption;
        username = data.username;
        fromAddress = data.from_address;
        fromName = data.from_name;
        hasPassword = data.has_password;
    });

    const driverOptions = [
        { value: 'smtp', label: 'SMTP 服务器' },
        { value: 'sendmail', label: 'Sendmail（本机发送）' },
        { value: 'log', label: '写入日志（不投递）' },
    ];

    const encryptionOptions = [
        { value: 'none', label: '无加密' },
        { value: 'tls', label: 'TLS（STARTTLS）' },
        { value: 'ssl', label: 'SSL / TLS（465）' },
    ];

    const smtpReady = $derived(driver !== 'smtp' || (host.trim() !== '' && fromAddress.trim() !== ''));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (saving) return;

        saving = true;
        saved = false;
        error = '';
        try {
            await updateMailSettings({
                enabled,
                driver,
                host: host.trim(),
                port: Number(port) || 25,
                encryption,
                username: username.trim(),
                password: password.trim(),
                from_address: fromAddress.trim(),
                from_name: fromName.trim(),
            });

            if (password.trim()) {
                hasPassword = true;
                password = '';
            }

            saved = true;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    async function sendTest() {
        if (testing) return;

        testing = true;
        tested = false;
        testError = '';
        try {
            await sendMailTestEmail(testAddress.trim());
            tested = true;
        } catch (e) {
            testError = httpErrorToHuman(e);
        } finally {
            testing = false;
        }
    }
</script>

<svelte:head>
    <title>邮件 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<form class="space-y-6" onsubmit={submit}>
    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {:else if saved}
        <Alert variant="success">邮件设置已保存。</Alert>
    {/if}

    {#if settings.error}
        <Alert variant="destructive">{httpErrorToHuman(settings.error)}</Alert>
    {:else if !settings.data}
        <div class="flex justify-center py-8"><Spinner centered /></div>
    {:else}
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2"><Mail class="size-4" />投递</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
                <label class="flex items-center justify-between gap-3 text-sm">
                    <span>
                        <span class="font-medium">启用邮件发送</span>
                        <span class="mt-0.5 block text-xs text-muted-foreground">
                            关闭后，面板不会发送任何邮件（例如密码重置链接），所有邮件都会写入日志。
                        </span>
                    </span>
                    <Switch bind:checked={enabled} aria-label="启用邮件发送" disabled={!canUpdate} />
                </label>

                <div class="space-y-1.5">
                    <Select
                        id="mail-driver"
                        items={driverOptions}
                        bind:value={driver}
                        disabled={!canUpdate}
                        label="发送方式"
                    />
                    <p class="text-xs text-muted-foreground">
                        {#if driver === 'smtp'}
                            通过 SMTP 服务器投递，填写下面的服务器信息。
                        {:else if driver === 'sendmail'}
                            调用主机上的 sendmail 程序投递，不经过 SMTP 服务器。
                        {:else}
                            邮件只会写入面板日志，不会真正投递，适合排查配置问题。
                        {/if}
                    </p>
                </div>
            </CardContent>
        </Card>

        {#if driver === 'smtp'}
            <Card>
                <CardHeader>
                    <CardTitle class="flex items-center gap-2"><Server class="size-4" />SMTP 服务器</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <div class="grid gap-4 md:grid-cols-3">
                        <div class="space-y-1.5 md:col-span-2">
                            <label for="mail-host" class="text-xs font-medium">服务器地址</label>
                            <Input id="mail-host" bind:value={host} placeholder="smtp.example.com" autocomplete="off" disabled={!canUpdate} />
                        </div>
                        <div class="space-y-1.5">
                            <label for="mail-port" class="text-xs font-medium">端口</label>
                            <Input id="mail-port" type="number" min="1" max="65535" bind:value={port} disabled={!canUpdate} />
                        </div>
                    </div>

                    <div class="grid gap-4 md:grid-cols-2">
                        <div class="space-y-1.5">
                            <Select
                                id="mail-encryption"
                                items={encryptionOptions}
                                bind:value={encryption}
                                disabled={!canUpdate}
                                label="加密方式"
                            />
                        </div>
                        <div class="space-y-1.5">
                            <label for="mail-username" class="text-xs font-medium">用户名</label>
                            <Input id="mail-username" bind:value={username} autocomplete="off" disabled={!canUpdate} />
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label for="mail-password" class="text-xs font-medium">密码</label>
                        <Input
                            id="mail-password"
                            type="password"
                            bind:value={password}
                            placeholder={hasPassword ? '已保存，留空保持不变' : '尚未配置'}
                            autocomplete="new-password"
                            disabled={!canUpdate}
                        />
                        <p class="text-xs text-muted-foreground">密码保存在数据库中，不会回显到页面上。</p>
                    </div>
                </CardContent>
            </Card>
        {/if}

        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2"><User class="size-4" />发件人</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="space-y-1.5">
                        <label for="mail-from-address" class="text-xs font-medium">发件地址</label>
                        <Input id="mail-from-address" type="email" bind:value={fromAddress} placeholder="no-reply@example.com" disabled={!canUpdate} />
                    </div>
                    <div class="space-y-1.5">
                        <label for="mail-from-name" class="text-xs font-medium">发件人名称</label>
                        <Input id="mail-from-name" bind:value={fromName} placeholder={app.settings?.name ?? 'Panel'} disabled={!canUpdate} />
                    </div>
                </div>
                <p class="text-xs text-muted-foreground">发件地址留空时，面板会使用安装地址派生的 no-reply 地址。</p>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2"><Send class="size-4" />发送测试邮件</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div class="space-y-1.5 flex-1">
                        <label for="mail-test-address" class="text-xs font-medium">收件地址</label>
                        <Input id="mail-test-address" type="email" bind:value={testAddress} placeholder="admin@example.com" disabled={!canUpdate} />
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        loading={testing}
                        disabled={!canUpdate || !enabled || testAddress.trim() === ''}
                        onclick={sendTest}
                    >
                        <Send />发送测试邮件
                    </Button>
                </div>
                {#if testError}
                    <Alert variant="destructive">{testError}</Alert>
                {:else if tested}
                    <Alert variant="success">测试邮件已发送，请检查收件箱。</Alert>
                {/if}
                <p class="text-xs text-muted-foreground">
                    发送方式为“写入日志”时，测试邮件不会真正投递，而是写到面板日志中。
                </p>
            </CardContent>
        </Card>

        <div class="flex items-center justify-between gap-4">
            <p class="text-xs text-muted-foreground">邮件设置保存在数据库中，保存后立即生效，无需重启面板。</p>
            {#if canUpdate}
                <Button type="submit" loading={saving} disabled={!smtpReady}>保存更改</Button>
            {/if}
        </div>
    {/if}
</form>
