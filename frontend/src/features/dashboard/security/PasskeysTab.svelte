<script lang="ts">
    import { z } from 'zod';
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { Fingerprint } from '@lucide/svelte';
    import {
        createPasskey,
        deletePasskey,
        getPasskeys,
        isPasskeyCancellation,
        passkeysSupported,
        securityKeys,
    } from '$lib/api/security';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { Passkey } from '$lib/api/definitions/account';
    import { app } from '$lib/stores/app.svelte';
    import { Form } from '$lib/forms/form.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CredentialList from './components/CredentialList.svelte';

    // Accounts created through an SSO module have no password to confirm against.
    const hasPassword = $derived(Boolean(app.user?.hasPassword));
    const supported = passkeysSupported();

    const queryClient = useQueryClient();
    const passkeysQuery = createQuery(() => ({
        queryKey: securityKeys.passkeys,
        queryFn: getPasskeys,
        refetchOnWindowFocus: false,
    }));

    const schema = z
        .object({ name: z.string().trim().min(1, '给这个 Passkey 起个名字，方便以后识别。'), password: z.string() })
        .refine(v => !hasPassword || v.password.length > 0, { message: '请输入账号密码。', path: ['password'] });

    const form = new Form({
        schema,
        initial: { name: '', password: '' },
        onSubmit: async values => {
            let passkey: Passkey;
            try {
                passkey = await createPasskey(values.name, hasPassword ? values.password : undefined);
            } catch (error) {
                // Dismissing the OS prompt is a choice, not a failure; leave the form as it was.
                if (isPasskeyCancellation(error)) {
                    form.succeeded = false;
                    return;
                }
                throw error;
            }

            queryClient.setQueryData<Passkey[]>(securityKeys.passkeys, keys => [...(keys ?? []), passkey]);
            form.reset();
            form.succeeded = true;
        },
    });

    let pendingDelete = $state<Passkey | null>(null);
    let deleteOpen = $state(false);
    let deletePassword = $state('');

    async function confirmDelete() {
        const target = pendingDelete;
        if (!target) return;

        await deletePasskey(target.uuid, hasPassword ? deletePassword : undefined);
        queryClient.setQueryData<Passkey[]>(securityKeys.passkeys, keys => keys?.filter(k => k.uuid !== target.uuid));
    }
</script>

<div class="grid gap-4 md:grid-cols-[2fr_3fr]">
    <Card class="self-start">
        <CardHeader><CardTitle>添加 Passkey</CardTitle></CardHeader>
        <CardContent>
            {#if !supported}
                <p class="text-sm text-muted-foreground">
                    此浏览器无法使用 Passkey。Passkey 需要安全连接（HTTPS）和较新的浏览器。
                </p>
            {:else}
                <form onsubmit={e => form.submit(e)} class="space-y-4" novalidate>
                    {#if form.errors._}
                        <Alert variant="destructive">{form.errors._}</Alert>
                    {:else if form.succeeded}
                        <Alert variant="success">Passkey 已添加。</Alert>
                    {/if}
                    <div>
                        <Label for="passkey-name">名称</Label>
                        <Input
                            id="passkey-name"
                            bind:value={form.values.name}
                            error={form.errors.name}
                            oninput={() => form.clearError('name')}
                            placeholder="例如：工作笔记本"
                        />
                    </div>
                    {#if hasPassword}
                        <div>
                            <Label for="passkey-password">当前密码</Label>
                            <Input
                                id="passkey-password"
                                type="password"
                                autocomplete="current-password"
                                bind:value={form.values.password}
                                error={form.errors.password}
                                oninput={() => form.clearError('password')}
                            />
                        </div>
                    {/if}
                    <p class="text-xs text-muted-foreground">
                        设备会要求你用指纹、面容、PIN 或安全密钥确认。添加后即可一步登录，无需密码或两步验证码。
                    </p>
                    <div class="flex justify-end">
                        <Button type="submit" size="sm" loading={form.submitting}>添加 Passkey</Button>
                    </div>
                </form>
            {/if}
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle>Passkey</CardTitle></CardHeader>
        <CardContent>
            <CredentialList
                items={passkeysQuery.data}
                key={k => k.uuid}
                loading={passkeysQuery.isPending}
                error={passkeysQuery.error ? httpErrorToHuman(passkeysQuery.error) : undefined}
                empty="此账号还没有 Passkey。"
                icon={Fingerprint}
                label={k => k.name}
                onDelete={k => {
                    pendingDelete = k;
                    deletePassword = '';
                    deleteOpen = true;
                }}
            >
                {#snippet row(passkey: Passkey)}
                    <p class="break-words text-sm font-medium">{passkey.name}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                        最后使用：{passkey.lastUsedAt ? formatDateTime(passkey.lastUsedAt) : '从未'}
                        · 添加于：{formatDateTime(passkey.createdAt)}
                    </p>
                {/snippet}
            </CredentialList>
        </CardContent>
    </Card>
</div>

<ConfirmDialog
    bind:open={deleteOpen}
    title="移除 Passkey"
    confirmLabel="移除 Passkey"
    onConfirm={confirmDelete}
    disabled={hasPassword && !deletePassword}
>
    <p>
        移除 <code class="rounded bg-muted px-1 font-mono">{pendingDelete?.name}</code> 后，它将无法再用于登录此账号。
    </p>
    {#if hasPassword}
        <Input
            type="password"
            bind:value={deletePassword}
            placeholder="当前密码"
            autocomplete="current-password"
            aria-label="当前密码"
        />
    {/if}
</ConfirmDialog>
