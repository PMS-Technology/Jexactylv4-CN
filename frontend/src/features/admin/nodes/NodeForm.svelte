<script lang="ts">
    import type { Snippet } from 'svelte';
    import { createQuery } from '@tanstack/svelte-query';
    import { Banknote, Database, Microchip, Network } from '@lucide/svelte';
    import { getDatabaseHosts } from '$lib/api/admin/databases';
    import type { AdminNode, NodeValues } from '$lib/api/admin/nodes';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Node fields, ported from NodeSettingsContainer, NodeListenContainer,
     * NodeLimitContainer, NodeBillingContainer, NodeExpressContainer and DatabaseSelect.
     * Checks follow Node::$validationRules: the legacy forms started memory and disk at 0
     * (the backend needs at least 1) and let any name through, though only ASCII letters,
     * digits, spaces, dots, dashes and underscores pass.
     */
    type Props = {
        node?: AdminNode | null;
        submitLabel: string;
        disabled?: boolean;
        onSubmit: (values: NodeValues) => Promise<void>;
        actions?: Snippet;
    };
    let { node = null, submitLabel, disabled = false, onSubmit, actions }: Props = $props();

    // Express mode only exists while creating, as in the legacy page.
    let advanced = $state(node !== null);

    let name = $state(node?.name ?? '');
    let fqdn = $state(node?.fqdn ?? '');
    let sftpAlias = $state(node?.sftpAlias ?? '');
    let scheme = $state<'http' | 'https'>(node?.scheme ?? 'https');
    let behindProxy = $state(node?.behindProxy ?? false);
    let isPublic = $state(node?.public ?? true);
    let daemonBase = $state(node?.daemonBase ?? '/var/lib/pterodactyl/volumes');
    let databaseHostId = $state(node?.databaseHostId ? String(node.databaseHostId) : '');
    let ports = $state({
        listenHttp: String(node?.listenPortHttp ?? 8080),
        publicHttp: String(node?.publicPortHttp ?? 8080),
        listenSftp: String(node?.listenPortSftp ?? 2022),
        publicSftp: String(node?.publicPortSftp ?? 2022),
    });
    let memory = $state(node ? String(node.memory) : '');
    let memoryOver = $state(String(node?.memoryOverallocate ?? 0));
    let disk = $state(node ? String(node.disk) : '');
    let diskOver = $state(String(node?.diskOverallocate ?? 0));
    let deployable = $state(node?.deployable ?? false);
    let deployableFree = $state(node?.deployableFree ?? false);
    let deploymentFee = $state(String(node?.deploymentFee ?? 0));

    const hosts = createQuery(() => ({
        queryKey: ['admin', 'database-hosts', 'options'],
        queryFn: () => getDatabaseHosts({}).then(r => r.items),
        enabled: app.can('databases.read'),
    }));

    const int = (v: string, min: number, max = Number.MAX_SAFE_INTEGER) => /^-?\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;
    const port = (v: string) => (int(v, 1, 65535) ? undefined : '端口需要在 1–65535 之间。');

    const errors = $derived({
        name: !/^[\w .-]{1,100}$/.test(name) ? '1–100 个字符，只能用英文字母、数字、空格、点、连字符和下划线。' : undefined,
        fqdn: !fqdn.trim() ? '请填写域名或 IP。' : undefined,
        daemonBase: !/^\/[\w.\-/]+$/.test(daemonBase.trim()) ? '需要以 / 开头的绝对路径。' : undefined,
        listenHttp: port(ports.listenHttp),
        publicHttp: port(ports.publicHttp),
        listenSftp: port(ports.listenSftp),
        publicSftp: port(ports.publicSftp),
        memory: int(memory, 1) ? undefined : '请输入不小于 1 的整数（MiB）。',
        disk: int(disk, 1) ? undefined : '请输入不小于 1 的整数（MiB）。',
        memoryOver: int(memoryOver, -1) ? undefined : '请输入不小于 -1 的整数。',
        diskOver: int(diskOver, -1) ? undefined : '请输入不小于 -1 的整数。',
        deploymentFee: /^\d+(\.\d{1,2})?$/.test(deploymentFee.trim()) ? undefined : '请输入不小于 0 的金额，最多两位小数。',
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    let saving = $state(false);
    let error = $state('');

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            await onSubmit({
                name: name.trim(),
                database_host_id: databaseHostId ? Number(databaseHostId) : null,
                fqdn: fqdn.trim(),
                sftp_alias: sftpAlias.trim() || null,
                scheme,
                behind_proxy: behindProxy,
                public: isPublic,
                deployable,
                deployable_free: deployableFree,
                deployment_fee: Number(deploymentFee),
                listen_port_http: Number(ports.listenHttp),
                public_port_http: Number(ports.publicHttp),
                listen_port_sftp: Number(ports.listenSftp),
                public_port_sftp: Number(ports.publicSftp),
                memory: Number(memory),
                memory_overallocate: Number(memoryOver),
                disk: Number(disk),
                disk_overallocate: Number(diskOver),
                ...(node ? {} : { daemon_base: daemonBase.trim() }),
            });
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    const off = $derived(disabled || saving);
    const select =
        'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50';
</script>

{#snippet toggle(label: string, hint: string, checked: boolean, set: (v: boolean) => void)}
    <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
        <span>
            <span class="font-medium">{label}</span>
            <span class="block text-xs text-muted-foreground">{hint}</span>
        </span>
        <Switch {checked} onCheckedChange={set} aria-label={label} disabled={off} />
    </label>
{/snippet}

{#snippet field(id: string, label: string, value: string, set: (v: string) => void, err?: string, hint?: string, mono = false)}
    <div class="space-y-1.5">
        <Label for={id}>{label}</Label>
        <Input {id} {value} oninput={e => set(e.currentTarget.value)} inputmode="numeric" class={mono ? 'font-mono' : ''} disabled={off} error={err} />
        {#if hint}<p class="text-xs text-muted-foreground">{hint}</p>{/if}
    </div>
{/snippet}

<form onsubmit={submit} class="space-y-4">
    {#if error}<Alert variant="destructive">{error}</Alert>{/if}

    {#if !node}
        <Card class="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
                <span class="font-medium">{advanced ? '高级模式' : '快速模式'}</span>
                <span class="block text-xs text-muted-foreground">
                    {advanced ? '配置节点的全部选项。' : '只填写必要信息，端口、超分配、数据目录等使用默认值。'}
                </span>
            </span>
            <Switch bind:checked={advanced} aria-label="高级模式" disabled={off} />
        </Card>
    {/if}

    <div class="grid gap-4 lg:grid-cols-2">
        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Database class="size-4" />基本信息</CardTitle></CardHeader>
                <CardContent class="space-y-4 text-sm">
                    <div class="space-y-1.5">
                        <Label for="node-name">名称</Label>
                        <Input id="node-name" bind:value={name} placeholder="Node 1" disabled={off} error={name ? errors.name : undefined} />
                    </div>
                    <div class="space-y-1.5">
                        <Label for="node-fqdn">域名（FQDN）</Label>
                        <Input id="node-fqdn" bind:value={fqdn} placeholder="node1.example.com" class="font-mono" disabled={off} error={fqdn ? errors.fqdn : undefined} />
                        <p class="text-xs text-muted-foreground">面板和浏览器连接 Wings 用的地址。</p>
                        {#if scheme === 'https' && !behindProxy && /^[\d.]+$|:/.test(fqdn.trim())}
                            <p class="text-xs text-warning">直接用 IP 时通常申请不到 SSL 证书，Wings 默认从 /etc/letsencrypt/live/&lt;域名&gt;/ 读取证书。</p>
                        {/if}
                    </div>
                    <div class="space-y-1.5">
                        <span class="text-sm font-medium">SSL</span>
                        <div class="grid grid-cols-2 overflow-hidden rounded-md border border-input" role="radiogroup" aria-label="SSL">
                            {#each [{ v: 'https', l: '启用（https）' }, { v: 'http', l: '关闭（http）' }] as o (o.v)}
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={scheme === o.v}
                                    disabled={off}
                                    onclick={() => (scheme = o.v as 'http' | 'https')}
                                    class={cn('px-3 py-2 text-sm font-medium transition-colors', scheme === o.v ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                                >
                                    {o.l}
                                </button>
                            {/each}
                        </div>
                        {#if scheme === 'http' && location.protocol === 'https:'}
                            <p class="text-xs text-warning">面板本身走 https，浏览器会拦截到 http 节点的 websocket 连接，控制台将无法使用。</p>
                        {/if}
                    </div>
                    {#if advanced}
                        <div class="space-y-1.5">
                            <Label for="node-sftp-alias">SFTP 别名</Label>
                            <Input id="node-sftp-alias" bind:value={sftpAlias} class="font-mono" disabled={off} />
                            <p class="text-xs text-muted-foreground">可选。文件管理器的 SFTP 信息里用它代替域名显示。</p>
                        </div>
                        <div class="space-y-1.5">
                            <Label for="node-daemon-base">数据目录</Label>
                            <Input id="node-daemon-base" bind:value={daemonBase} class="font-mono" disabled={off || node !== null} error={errors.daemonBase} />
                            <p class="text-xs text-muted-foreground">{node ? '创建后不能修改。' : 'Wings 存放服务器文件的目录。'}</p>
                        </div>
                        <div class="space-y-1.5">
                            <Label for="node-database-host">数据库主机</Label>
                            <select id="node-database-host" class={select} bind:value={databaseHostId} disabled={off || !hosts.data}>
                                <option value="">不指定</option>
                                {#each hosts.data ?? [] as h (h.id)}
                                    <option value={String(h.id)}>{h.name}（{h.host}:{h.port}）</option>
                                {/each}
                            </select>
                            <p class="text-xs text-muted-foreground">这个节点上的服务器默认在哪个主机上创建数据库。</p>
                        </div>
                        {@render toggle('位于代理之后', '节点前面有 Cloudflare 等反向代理时开启，Wings 不再自己申请证书。', behindProxy, v => (behindProxy = v))}
                        {@render toggle('自动分配', '允许部署服务器时自动从这个节点选取端口。', isPublic, v => (isPublic = v))}
                    {/if}
                </CardContent>
            </Card>
        </div>

        <div class="flex flex-col gap-4">
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Microchip class="size-4" />资源上限</CardTitle></CardHeader>
                <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
                    {@render field('node-memory', '内存（MiB）', memory, v => (memory = v), memory ? errors.memory : undefined)}
                    {@render field('node-disk', '磁盘（MiB）', disk, v => (disk = v), disk ? errors.disk : undefined)}
                    {#if advanced}
                        {@render field('node-memory-over', '内存超分配（%）', memoryOver, v => (memoryOver = v), errors.memoryOver, '0 表示不允许超出，-1 表示不检查。')}
                        {@render field('node-disk-over', '磁盘超分配（%）', diskOver, v => (diskOver = v), errors.diskOver, '0 表示不允许超出，-1 表示不检查。')}
                    {/if}
                </CardContent>
            </Card>

            {#if advanced}
                <Card>
                    <CardHeader><CardTitle class="flex items-center gap-2"><Network class="size-4" />端口</CardTitle></CardHeader>
                    <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
                        {@render field('node-listen-http', 'HTTP 监听端口', ports.listenHttp, v => (ports.listenHttp = v), errors.listenHttp, undefined, true)}
                        {@render field('node-public-http', 'HTTP 公开端口', ports.publicHttp, v => (ports.publicHttp = v), errors.publicHttp, '经过代理时可以与监听端口不同。', true)}
                        {@render field('node-listen-sftp', 'SFTP 监听端口', ports.listenSftp, v => (ports.listenSftp = v), errors.listenSftp, undefined, true)}
                        {@render field('node-public-sftp', 'SFTP 公开端口', ports.publicSftp, v => (ports.publicSftp = v), errors.publicSftp, undefined, true)}
                    </CardContent>
                </Card>
            {/if}

            {#if app.flags?.billing.enabled || advanced}
                <Card>
                    <CardHeader><CardTitle class="flex items-center gap-2"><Banknote class="size-4" />计费</CardTitle></CardHeader>
                    <CardContent class="space-y-3 text-sm">
                        {@render toggle('可部署付费服务器', '计费系统开启时，用户购买的服务器可以部署到这里。', deployable, v => (deployable = v))}
                        {@render toggle('可部署免费服务器', '用户领取的免费套餐可以部署到这里。', deployableFree, v => (deployableFree = v))}
                        <div class="space-y-1.5">
                            <Label for="node-fee">部署费</Label>
                            <Input id="node-fee" inputmode="decimal" bind:value={deploymentFee} disabled={off} error={errors.deploymentFee} />
                            <p class="text-xs text-muted-foreground">付费服务器首次部署到这个节点时，在套餐价格之外额外收取一次。0 表示不收。</p>
                        </div>
                    </CardContent>
                </Card>
            {/if}
        </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2">
        <div>{@render actions?.()}</div>
        {#if !disabled}
            <Button type="submit" loading={saving} disabled={!valid}>{submitLabel}</Button>
        {/if}
    </div>
</form>
