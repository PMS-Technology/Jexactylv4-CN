<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { DatabaseHost, DatabaseHostValues } from '$lib/api/admin/databases';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Host fields, ported from the InformationContainer in DatabaseEditContainer.tsx.
     * Checks follow DatabaseHost::$validationRules (the legacy Yup schema allowed ports
     * 2–65534 and left host and username optional, which the backend rejects).
     */
    type Props = {
        id: string;
        host?: DatabaseHost | null;
        disabled?: boolean;
        submitLabel: string;
        onSubmit: (values: DatabaseHostValues) => Promise<void>;
        /** Extra actions on the leading side of the footer, e.g. delete. */
        actions?: Snippet;
    };
    let { id, host = null, disabled = false, submitLabel, onSubmit, actions }: Props = $props();

    let name = $state(host?.name ?? '');
    let address = $state(host?.host ?? '');
    let port = $state(String(host?.port ?? 3306));
    let username = $state(host?.username ?? '');
    let password = $state('');
    let saving = $state(false);
    let error = $state('');

    const errors = $derived({
        name: !name.trim() || name.trim().length > 191 ? '名称需要 1–191 个字符。' : undefined,
        host: !/^[\w\-.]+$/.test(address.trim()) ? '只能包含字母、数字、点、连字符和下划线。' : undefined,
        port: !/^\d+$/.test(port.trim()) || Number(port) < 1 || Number(port) > 65535 ? '端口需要在 1–65535 之间。' : undefined,
        username: !username.trim() || username.trim().length > 32 ? '用户名需要 1–32 个字符。' : undefined,
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            await onSubmit({
                name: name.trim(),
                host: address.trim(),
                port: Number(port),
                username: username.trim(),
                // An empty password on update keeps the stored one (HostUpdateService).
                ...(password ? { password } : {}),
            });
            password = '';
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<form {id} class="space-y-4 text-sm" onsubmit={submit}>
    {#if error}<Alert variant="destructive">{error}</Alert>{/if}
    <div class="space-y-1.5">
        <Label for="{id}-name">名称</Label>
        <Input id="{id}-name" bind:value={name} placeholder="主数据库" disabled={disabled || saving} error={name ? errors.name : undefined} />
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
        <div class="space-y-1.5 sm:col-span-2">
            <Label for="{id}-host">主机</Label>
            <Input id="{id}-host" bind:value={address} placeholder="127.0.0.1" class="font-mono" disabled={disabled || saving} error={address ? errors.host : undefined} />
        </div>
        <div class="space-y-1.5">
            <Label for="{id}-port">端口</Label>
            <Input id="{id}-port" inputmode="numeric" bind:value={port} class="font-mono" disabled={disabled || saving} error={errors.port} />
        </div>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
            <Label for="{id}-username">用户名</Label>
            <Input id="{id}-username" bind:value={username} autocomplete="off" disabled={disabled || saving} error={username ? errors.username : undefined} />
        </div>
        <div class="space-y-1.5">
            <Label for="{id}-password">密码</Label>
            <Input
                id="{id}-password"
                type="password"
                bind:value={password}
                autocomplete="new-password"
                placeholder={host ? '留空则保持不变' : ''}
                disabled={disabled || saving}
            />
        </div>
    </div>
    <p class="text-xs text-muted-foreground">
        这个账号需要能在主机上创建数据库和用户（通常需要 <code class="font-mono">WITH GRANT OPTION</code>）。保存时面板会用这些凭据连接一次，连接失败则不会保存。
    </p>
    <div class="flex flex-wrap items-center justify-between gap-2">
        <div>{@render actions?.()}</div>
        {#if !disabled}
            <Button type="submit" loading={saving} disabled={!valid}>{submitLabel}</Button>
        {/if}
    </div>
</form>
