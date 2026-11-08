<script lang="ts">
    import { z } from 'zod';
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { KeyRound } from '@lucide/svelte';
    import { createSSHKey, deleteSSHKey, getSSHKeys, securityKeys } from '$lib/api/security';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { SSHKey } from '$lib/api/definitions/account';
    import { Form } from '$lib/forms/form.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, Input, Label, Textarea } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CredentialList from './components/CredentialList.svelte';

    const queryClient = useQueryClient();
    const keysQuery = createQuery(() => ({
        queryKey: securityKeys.sshKeys,
        queryFn: getSSHKeys,
        refetchOnWindowFocus: false,
    }));

    const schema = z.object({
        name: z.string().trim().min(1, '请填写密钥名称。'),
        publicKey: z.string().trim().min(1, '请粘贴公钥。'),
    });

    const form = new Form({
        schema,
        initial: { name: '', publicKey: '' },
        onSubmit: async values => {
            const key = await createSSHKey(values.name, values.publicKey);
            queryClient.setQueryData<SSHKey[]>(securityKeys.sshKeys, keys => [...(keys ?? []), key]);
            form.reset();
            form.succeeded = true;
        },
    });

    let pendingDelete = $state<SSHKey | null>(null);
    let deleteOpen = $state(false);

    async function confirmDelete() {
        const target = pendingDelete;
        if (!target) return;

        await deleteSSHKey(target.fingerprint);
        queryClient.setQueryData<SSHKey[]>(securityKeys.sshKeys, keys =>
            keys?.filter(k => k.fingerprint !== target.fingerprint),
        );
    }
</script>

<div class="grid gap-4 md:grid-cols-[2fr_3fr]">
    <Card class="self-start">
        <CardHeader><CardTitle>添加 SSH 密钥</CardTitle></CardHeader>
        <CardContent>
            <form onsubmit={e => form.submit(e)} class="space-y-4" novalidate>
                {#if form.errors._}
                    <Alert variant="destructive">{form.errors._}</Alert>
                {:else if form.succeeded}
                    <Alert variant="success">SSH 密钥已添加。</Alert>
                {/if}
                <div>
                    <Label for="ssh-name">密钥名称</Label>
                    <Input
                        id="ssh-name"
                        bind:value={form.values.name}
                        error={form.errors.name}
                        oninput={() => form.clearError('name')}
                    />
                </div>
                <div>
                    <Label for="ssh-public-key">公钥</Label>
                    <Textarea
                        id="ssh-public-key"
                        bind:value={form.values.publicKey}
                        error={form.errors.publicKey}
                        oninput={() => form.clearError('publicKey')}
                        placeholder="ssh-ed25519 AAAA…"
                        class="h-28 font-mono"
                        spellcheck={false}
                    />
                </div>
                <div class="flex justify-end">
                    <Button type="submit" size="sm" loading={form.submitting}>保存</Button>
                </div>
            </form>
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle>SSH 密钥</CardTitle></CardHeader>
        <CardContent>
            <CredentialList
                items={keysQuery.data}
                key={k => k.fingerprint}
                loading={keysQuery.isPending}
                error={keysQuery.error ? httpErrorToHuman(keysQuery.error) : undefined}
                empty="此账号还没有 SSH 密钥。"
                icon={KeyRound}
                label={k => k.name}
                onDelete={k => {
                    pendingDelete = k;
                    deleteOpen = true;
                }}
            >
                {#snippet row(key: SSHKey)}
                    <p class="break-words text-sm font-medium">{key.name}</p>
                    <p class="mt-0.5 truncate font-mono text-xs text-muted-foreground">SHA256:{key.fingerprint}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">添加于：{formatDateTime(key.createdAt)}</p>
                {/snippet}
            </CredentialList>
        </CardContent>
    </Card>
</div>

<ConfirmDialog bind:open={deleteOpen} title="删除 SSH 密钥" confirmLabel="删除密钥" onConfirm={confirmDelete}>
    <p>
        删除 <code class="rounded bg-muted px-1 font-mono">{pendingDelete?.name}</code> 后，该密钥将无法再用于访问面板。
    </p>
</ConfirmDialog>
