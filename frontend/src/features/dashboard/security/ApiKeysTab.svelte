<script lang="ts">
    import { z } from 'zod';
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { KeyRound } from '@lucide/svelte';
    import { createApiKey, deleteApiKey, getApiKeys, securityKeys } from '$lib/api/security';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { ApiKey } from '$lib/api/definitions/account';
    import { Form } from '$lib/forms/form.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import {
        Button,
        Card,
        CardContent,
        CardHeader,
        CardTitle,
        ConfirmDialog,
        Dialog,
        Input,
        Label,
        Textarea,
    } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import CredentialList from './components/CredentialList.svelte';

    const queryClient = useQueryClient();
    const keysQuery = createQuery(() => ({
        queryKey: securityKeys.apiKeys,
        queryFn: getApiKeys,
        refetchOnWindowFocus: false,
    }));

    // Matches the legacy Yup schema (min 4) and the backend's `memo` rule (max 500).
    const schema = z.object({
        description: z.string().trim().min(4, '描述至少 4 个字符。').max(500, '描述最多 500 个字符。'),
        allowedIps: z.string(),
    });

    let createdToken = $state('');
    let tokenOpen = $state(false);

    const form = new Form({
        schema,
        initial: { description: '', allowedIps: '' },
        onSubmit: async values => {
            const ips = values.allowedIps
                .split('\n')
                .map(ip => ip.trim())
                .filter(Boolean);
            const { token, ...key } = await createApiKey(values.description, ips);

            queryClient.setQueryData<ApiKey[]>(securityKeys.apiKeys, keys => [...(keys ?? []), key]);
            form.reset();
            createdToken = token;
            tokenOpen = true;
        },
    });

    let pendingDelete = $state<ApiKey | null>(null);
    let deleteOpen = $state(false);

    async function confirmDelete() {
        const target = pendingDelete;
        if (!target) return;

        await deleteApiKey(target.identifier);
        queryClient.setQueryData<ApiKey[]>(securityKeys.apiKeys, keys =>
            keys?.filter(k => k.identifier !== target.identifier),
        );
    }
</script>

<div class="grid gap-4 md:grid-cols-[2fr_3fr]">
    <Card class="self-start">
        <CardHeader><CardTitle>创建 API 密钥</CardTitle></CardHeader>
        <CardContent>
            <form onsubmit={e => form.submit(e)} class="space-y-4" novalidate>
                {#if form.errors._}
                    <Alert variant="destructive">{form.errors._}</Alert>
                {/if}
                <div>
                    <Label for="api-description">描述</Label>
                    <Input
                        id="api-description"
                        bind:value={form.values.description}
                        error={form.errors.description}
                        oninput={() => form.clearError('description')}
                    />
                </div>
                <div>
                    <Label for="api-ips">允许的 IP</Label>
                    <Textarea id="api-ips" bind:value={form.values.allowedIps} class="h-28 font-mono" />
                    <p class="mt-1.5 text-xs text-muted-foreground">
                        留空表示允许任意 IP 使用此密钥；否则每行填写一个 IP 地址或 CIDR。
                    </p>
                </div>
                <div class="flex justify-end">
                    <Button type="submit" size="sm" loading={form.submitting}>创建</Button>
                </div>
            </form>
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle>API 密钥</CardTitle></CardHeader>
        <CardContent>
            <CredentialList
                items={keysQuery.data}
                key={k => k.identifier}
                loading={keysQuery.isPending}
                error={keysQuery.error ? httpErrorToHuman(keysQuery.error) : undefined}
                empty="此账号还没有 API 密钥。"
                icon={KeyRound}
                label={k => k.description}
                onDelete={k => {
                    pendingDelete = k;
                    deleteOpen = true;
                }}
            >
                {#snippet row(key: ApiKey)}
                    <p class="break-words text-sm">{key.description}</p>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                        <code class="font-mono">{key.identifier}</code>
                        · 最后使用：{key.lastUsedAt ? formatDateTime(key.lastUsedAt) : '从未'}
                    </p>
                {/snippet}
            </CredentialList>
        </CardContent>
    </Card>
</div>

<ConfirmDialog bind:open={deleteOpen} title="删除 API 密钥" confirmLabel="删除密钥" onConfirm={confirmDelete}>
    <p>
        所有使用 <code class="rounded bg-muted px-1 font-mono">{pendingDelete?.identifier}</code> 密钥的请求都将失效。
    </p>
</ConfirmDialog>

<Dialog bind:open={tokenOpen} title="你的 API 密钥" description="请妥善保存此密钥，它不会再次显示。" preventClose>
    <div class="flex items-center gap-2 rounded-md bg-muted p-3">
        <code class="min-w-0 flex-1 break-all font-mono text-sm">{createdToken}</code>
        <CopyButton text={createdToken} />
    </div>

    {#snippet footer()}
        <Button
            size="sm"
            onclick={() => {
                tokenOpen = false;
                createdToken = '';
            }}
        >
            关闭
        </Button>
    {/snippet}
</Dialog>
