<script lang="ts">
    import { Cpu, HardDrive, MemoryStick, Plus, X } from '@lucide/svelte';
    import { useQueryClient } from '@tanstack/svelte-query';
    import type { Server, ServerGroup } from '$lib/api/definitions/server';
    import { bytesToString, formatLimit, mbToBytes } from '$lib/utils/format';
    import { removeServerFromGroup } from '$lib/api/groups';
    import { cn } from '$lib/utils/cn';

    let { server, group, onAssign }: { server: Server; group?: ServerGroup; onAssign?: () => void } = $props();

    const queryClient = useQueryClient();

    let removing = $state(false);

    async function removeFromGroup() {
        if (!group || removing) return;

        removing = true;
        try {
            await removeServerFromGroup(group.id, server.uuid);
            await queryClient.invalidateQueries({ queryKey: ['server-groups'] });
            await queryClient.invalidateQueries({ queryKey: ['servers'] });
        } finally {
            removing = false;
        }
    }

    /**
     * A server in any non-null status is unusable until the state clears — installing,
     * suspended, restoring and so on. The legacy dashboard surfaced the same distinction.
     */
    const statusLabel = $derived.by(() => {
        if (server.isNodeUnderMaintenance) return { text: '节点维护中', tone: 'warning' as const };
        if (server.isTransferring) return { text: '迁移中', tone: 'warning' as const };

        switch (server.status) {
            case 'installing':
                return { text: '安装中', tone: 'warning' as const };
            case 'install_failed':
            case 'reinstall_failed':
                return { text: '安装失败', tone: 'danger' as const };
            case 'suspended':
                return { text: '已停用', tone: 'danger' as const };
            case 'restoring_backup':
                return { text: '恢复备份中', tone: 'warning' as const };
            default:
                return null;
        }
    });

    const toneClasses = {
        warning: 'bg-warning/15 text-warning-foreground ring-1 ring-warning/30',
        danger: 'bg-destructive/15 text-destructive ring-1 ring-destructive/30',
    } as const;

    const primaryAllocation = $derived(
        server.allocations.find(a => a.isDefault) ?? server.allocations[0],
    );
</script>

<!--
    /server/* still renders through the legacy Preact shell (see IndexController's
    whitelist), so this is a plain anchor — a client-side Link would land on the SPA's
    NotFound page.
-->
<a
    href={`/server/${server.id}`}
    class="group block rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
    <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
            <p class="truncate font-medium">{server.name}</p>
            {#if server.description}
                <p class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{server.description}</p>
            {/if}
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
            {#if group}
                <span
                    class="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-2xs font-medium"
                >
                    <span class="size-1.5 rounded-full" style={group.color ? `background-color: ${group.color}` : undefined}></span>
                    <span style={group.color ? `color: ${group.color}` : undefined}>{group.name}</span>
                    <button
                        type="button"
                        class="ml-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                        title="从分组移除"
                        disabled={removing}
                        onclick={(event) => {
                            // Keep the card link from following the click.
                            event.preventDefault();
                            event.stopPropagation();
                            removeFromGroup();
                        }}
                    >
                        <X class="size-3" />
                    </button>
                </span>
            {:else if onAssign}
                <button
                    type="button"
                    class="hidden items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-2xs text-muted-foreground/60 transition-colors hover:border-foreground/30 hover:text-foreground xl:inline-flex"
                    onclick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onAssign();
                    }}
                >
                    <Plus class="size-3" /> 分组
                </button>
            {/if}

            {#if statusLabel}
                <span class={cn('rounded-full px-2 py-0.5 text-2xs font-medium', toneClasses[statusLabel.tone])}>
                    {statusLabel.text}
                </span>
            {/if}
        </div>
    </div>

    <dl class="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div class="space-y-1">
            <dt class="flex items-center gap-1 text-muted-foreground">
                <Cpu class="size-3" /> CPU
            </dt>
            <dd class="font-mono">{formatLimit(server.limits.cpu, '%')}</dd>
        </div>
        <div class="space-y-1">
            <dt class="flex items-center gap-1 text-muted-foreground">
                <MemoryStick class="size-3" /> 内存
            </dt>
            <dd class="font-mono">
                {server.limits.memory === 0 ? 'Unlimited' : bytesToString(mbToBytes(server.limits.memory))}
            </dd>
        </div>
        <div class="space-y-1">
            <dt class="flex items-center gap-1 text-muted-foreground">
                <HardDrive class="size-3" /> 磁盘
            </dt>
            <dd class="font-mono">
                {server.limits.disk === 0 ? 'Unlimited' : bytesToString(mbToBytes(server.limits.disk))}
            </dd>
        </div>
    </dl>

    {#if primaryAllocation}
        <p class="mt-3 truncate border-t border-border pt-3 font-mono text-xs text-muted-foreground">
            {primaryAllocation.alias ?? primaryAllocation.ip}:{primaryAllocation.port}
        </p>
    {/if}
</a>
