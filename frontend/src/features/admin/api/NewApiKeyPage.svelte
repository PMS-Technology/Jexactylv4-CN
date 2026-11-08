<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { Cog, KeyRound, X } from '@lucide/svelte';
    import { API_KEY_RESOURCES, createApiKey, type ApiKeyPermissions } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';

    /** New application API key, ported from NewApiKeyContainer.tsx and PermissionRow.tsx. */
    const queryClient = useQueryClient();

    const labels: Record<(typeof API_KEY_RESOURCES)[number], string> = {
        allocations: '分配',
        database_hosts: '数据库主机',
        eggs: 'Eggs',
        locations: '地域',
        nests: 'Nests',
        nodes: '节点',
        server_databases: '服务器数据库',
        servers: '服务器',
        users: '用户账号',
    };
    const levels = [
        { value: 0, label: '无权限' },
        { value: 1, label: '只读' },
        { value: 2, label: '读写' },
    ] as const;

    let memo = $state('');
    let permissions = $state(
        Object.fromEntries(API_KEY_RESOURCES.map(r => [`r_${r}`, 0])) as ApiKeyPermissions,
    );

    // ApiKey::$validationRules: memo is required, 1–500 characters.
    const valid = $derived(memo.trim().length > 0 && memo.trim().length <= 500);

    let saving = $state(false);
    let error = $state('');
    let token = $state<string | null>(null);
    let tokenOpen = $state(false);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            token = await createApiKey(memo.trim(), permissions);
            tokenOpen = true;
            await queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] });
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<form onsubmit={submit} class="space-y-4">
    <div class="flex justify-end">
        <Button variant="ghost" href="/admin/api"><X />取消</Button>
    </div>

    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {/if}

    <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Cog class="size-4" />设置</CardTitle></CardHeader>
                <CardContent class="space-y-1.5">
                    <Label for="api-memo">密钥备注</Label>
                    <Input id="api-memo" bind:value={memo} maxlength={500} disabled={saving} placeholder="例如：自动化部署脚本" />
                    <p class="text-xs text-muted-foreground">用于识别此密钥的名称或说明。</p>
                </CardContent>
            </Card>
            <div class="flex justify-end">
                <Button type="submit" loading={saving} disabled={!valid}>创建</Button>
            </div>
        </div>

        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><KeyRound class="size-4" />访问权限</CardTitle></CardHeader>
            <CardContent class="space-y-3">
                {#each API_KEY_RESOURCES as resource (resource)}
                    {@const key = `r_${resource}` as const}
                    <fieldset class="rounded-md bg-muted/50 p-3">
                        <legend class="sr-only">{labels[resource]}</legend>
                        <p class="mb-2 text-sm font-medium">{labels[resource]}</p>
                        <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            {#each levels as level (level.value)}
                                <label class="inline-flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name={key}
                                        value={level.value}
                                        checked={permissions[key] === level.value}
                                        onchange={() => (permissions[key] = level.value)}
                                        disabled={saving}
                                        class="accent-primary"
                                    />
                                    {level.label}
                                </label>
                            {/each}
                        </div>
                    </fieldset>
                {/each}
            </CardContent>
        </Card>
    </div>
</form>

<Dialog bind:open={tokenOpen} title="你的 API 密钥" preventClose onOpenChange={o => o || navigate('/admin/api')}>
    <div class="space-y-3 text-sm">
        <Alert variant="warning">请立即保存此密钥，关闭后将无法再次查看。</Alert>
        <div class="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
            <code class="min-w-0 flex-1 font-mono text-xs break-all">{token}</code>
            {#if token}<CopyButton text={token} />{/if}
        </div>
    </div>
    {#snippet footer()}
        <Button size="sm" onclick={() => {
            tokenOpen = false;
            navigate('/admin/api');
        }}>我已保存</Button>
    {/snippet}
</Dialog>
