<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { adminNestKeys, updateEgg, type Egg } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import CodeField from './CodeField.svelte';

    /**
     * The install script, ported from EggInstallContainer.tsx. The legacy page silently did
     * nothing on save when the editor had not reported in yet, and could not save an empty
     * script (the request rejected it).
     */
    let { egg }: { egg: Egg } = $props();

    const queryClient = useQueryClient();
    const canUpdate = $derived(app.can('eggs.update'));

    let container = $state(egg.script.container);
    let entry = $state(egg.script.entry);
    let getScript = () => egg.script.install;

    const errors = $derived({
        container: container.trim() ? undefined : '请填写安装容器镜像。',
        entry: entry.trim() ? undefined : '请填写入口命令。',
    });
    const valid = $derived(!errors.container && !errors.entry);

    let saving = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;
        saving = true;
        notice = null;
        try {
            await updateEgg(egg.id, { script_container: container.trim(), script_entry: entry.trim(), script_install: getScript().replace(/\r\n/g, '\n') });
            await queryClient.invalidateQueries({ queryKey: adminNestKeys.egg(egg.id) });
            notice = { variant: 'success', text: '安装脚本已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    const off = $derived(!canUpdate || saving);
</script>

<form onsubmit={save} class="space-y-4">
    {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}
    {#if egg.script.extends}
        <Alert variant="warning">
            这个 Egg 使用 <Link href="/admin/nests/{egg.nestId}/eggs/{egg.script.extends}" class="underline">Egg #{egg.script.extends}</Link> 的安装脚本，这里的修改不会在安装时生效。
        </Alert>
    {/if}
    <Card>
        <CardHeader><CardTitle>安装脚本</CardTitle></CardHeader>
        <CardContent class="space-y-4 text-sm">
            <CodeField content={egg.script.install} filename="install.sh" registerContent={get => (getScript = get)} class="h-[28rem]" />
            <div class="grid gap-4 lg:grid-cols-2">
                <div class="space-y-1.5">
                    <Label for="install-container">安装容器</Label>
                    <Input id="install-container" bind:value={container} class="font-mono text-xs" disabled={off} error={errors.container} />
                    <p class="text-xs text-muted-foreground">运行安装脚本的 Docker 镜像。</p>
                </div>
                <div class="space-y-1.5">
                    <Label for="install-entry">入口命令</Label>
                    <Input id="install-entry" bind:value={entry} class="font-mono text-xs" disabled={off} error={errors.entry} />
                    <p class="text-xs text-muted-foreground">在安装容器里执行脚本的程序，例如 bash 或 /bin/ash。</p>
                </div>
            </div>
        </CardContent>
    </Card>
    {#if canUpdate}
        <div class="flex justify-end rounded-lg border border-border bg-card p-3">
            <Button type="submit" loading={saving} disabled={!valid}>保存</Button>
        </div>
    {/if}
</form>
