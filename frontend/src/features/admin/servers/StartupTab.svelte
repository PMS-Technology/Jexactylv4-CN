<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { adminServerKeys, updateServerStartup, type AdminServer, type EggOption } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card } from '$lib/ui';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import ServiceFields from './ServiceFields.svelte';
    import { variableErrors } from './limits';

    /**
     * Startup command, egg, image and variables, ported from ServerStartupContainer.tsx.
     * The legacy form sent `environment` as an empty list until each variable box had
     * mounted and copied its value in; values are loaded up front here.
     */
    let { server }: { server: AdminServer } = $props();

    const queryClient = useQueryClient();
    const canUpdate = $derived(app.can('servers.update'));

    let nestId = $state<number | null>(server.nestId);
    let eggId = $state<number | null>(server.eggId);
    let image = $state(server.container.image);
    let startup = $state(server.container.startup ?? '');
    let environment = $state<Record<string, string>>({});
    let egg = $state<EggOption | null>(null);
    let skipScripts = $state(false);

    const initial = {
        eggId: server.eggId,
        values: Object.fromEntries(server.variables.map(v => [v.envVariable, v.serverValue ?? v.defaultValue])),
    };

    const vErrors = $derived(variableErrors(egg, environment));
    const valid = $derived(Boolean(eggId && image.trim() && startup.trim()) && !Object.keys(vErrors).length);
    const eggChanged = $derived(eggId !== server.eggId);

    let saving = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        notice = null;
        // Read before the refetch below replaces `server` with the saved egg.
        const changed = eggChanged;
        try {
            await updateServerStartup(server.id, { startup: startup.trim(), environment, egg_id: eggId!, image: image.trim(), skip_scripts: skipScripts });
            await queryClient.invalidateQueries({ queryKey: adminServerKeys.server(server.id) });
            notice = { variant: 'success', text: changed ? '已保存。Egg 已更换，需要重装服务器才会使用新 Egg 的安装脚本。' : '启动配置已保存，下次启动时生效。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }
</script>

<form onsubmit={save} class="space-y-4">
    {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}
    {#if eggChanged}<Alert variant="warning">更换 Egg 后，变量会换成新 Egg 的默认值。现有文件不会被改动。</Alert>{/if}

    <ServiceFields bind:nestId bind:eggId bind:image bind:startup bind:environment bind:egg {initial} disabled={!canUpdate || saving} />

    <Card class="flex items-center justify-between gap-4 p-4 text-sm">
        <span>
            <span class="font-medium">跳过安装脚本</span>
            <span class="block text-xs text-muted-foreground">重装时不运行 Egg 的安装脚本。</span>
        </span>
        <Switch bind:checked={skipScripts} aria-label="跳过安装脚本" disabled={!canUpdate || saving} />
    </Card>

    {#if canUpdate}
        <div class="flex justify-end"><Button type="submit" loading={saving} disabled={!valid}>保存</Button></div>
    {/if}
</form>
