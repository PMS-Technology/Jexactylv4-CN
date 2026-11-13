<script lang="ts">
    import { Clock, Cpu, Globe, HardDrive, MemoryStick } from '@lucide/svelte';
    import type { Component } from 'svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent, SocketRequest, type SocketStats } from '$lib/api/definitions/events';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { bytesToString, formatIp, formatUptime, mbToBytes } from '$lib/utils/format';
    import { Meter } from '$lib/ui';

    /**
     * The live resource strip, ported from ServerDetailsBlock.tsx: address, uptime,
     * CPU, memory and disk, fed by the socket's `stats` event (requested once on
     * connect via `send stats`).
     *
     * The three resources that have a limit are shown as a value over a meter, so
     * the proportion of the limit is read off the bar instead of being worked out
     * from the two numbers. The meter is the same hue for all three; the colour only
     * changes when a resource is close to its limit, which is a status rather than
     * a series.
     */
    let { store }: { store: ServerStore } = $props();

    let stats = $state<SocketStats | null>(null);

    websocketEvent(store, SocketEvent.STATS, (raw: string) => {
        try {
            stats = JSON.parse(raw) as SocketStats;
        } catch {
            // A malformed payload just keeps the last known values.
        }
    });

    $effect(() => {
        if (store.connected && store.instance) {
            store.instance.send(SocketRequest.SEND_STATS);
        }
    });

    const allocation = $derived.by(() => {
        const match = store.server?.allocations.find(a => a.isDefault);
        if (!match) return { display: 'n/a', copy: 'n/a' };

        const address = `${match.alias || formatIp(match.ip)}:${match.port}`;

        return { display: match.notes || address, copy: address };
    });

    /**
     * Ported threshold colouring: >80% amber, >90% red. The meter uses the same
     * thresholds as the value, so the bar and the number agree.
     */
    function usageTone(value: number, max: number): string | undefined {
        if (!max) return undefined;
        const delta = value / max;

        if (delta > 0.9) return 'text-destructive';
        if (delta > 0.8) return 'text-warning';

        return undefined;
    }

    /**
     * The fill of a usage meter, coloured by the same thresholds as the value. The
     * normal colour is the first chart series colour, so a meter and the chart of
     * the same resource are the same hue; the thresholds take over when the
     * resource is close to its limit, which is a status rather than a series.
     */
    function meterTone(value: number, max: number): string {
        if (!max) return 'bg-chart-1';

        const delta = value / max;
        if (delta > 0.9) return 'bg-destructive';
        if (delta > 0.8) return 'bg-warning';

        return 'bg-chart-1';
    }

    /**
     * Ported from the legacy uptime block: running is neutral, anything not offline
     * (starting/stopping) is amber, offline is red.
     */
    const uptimeTone = $derived(
        store.status === null ? 'text-destructive' : store.status === 'running' ? undefined : 'text-warning',
    );

    const uptimeLabel = $derived.by(() => {
        if (store.status === null) return '离线';
        if (stats && stats.uptime > 0) return formatUptime(stats.uptime);

        return store.status ? store.status[0]!.toUpperCase() + store.status.slice(1) : '—';
    });

    let copied = $state(false);
    let copyTimer: ReturnType<typeof setTimeout> | undefined;

    // The legacy block wraps the whole StatBlock in CopyOnClick; clicking anywhere on
    // the address tile copies the connection address.
    async function copyAddress() {
        try {
            await navigator.clipboard.writeText(allocation.copy);
        } catch {
            return;
        }

        copied = true;
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => (copied = false), 2000);
    }

    const offline = $derived(store.status === 'offline');

    /**
     * The panel stores the memory and disk limits in MiB while the daemon reports
     * usage in bytes, so the limits are converted to KiB — the unit the usage is
     * divided into — before the two are compared. Mixing the two units would make
     * a server look like it is thousands of percent over its limit.
     */
    const cpuLimit = $derived(store.server?.limits.cpu || 0);
    const memoryLimitMiB = $derived(store.server?.limits.memory || 0);
    const diskLimitMiB = $derived(store.server?.limits.disk || 0);

    /** The three limited resources, in the order they are shown. */
    const resources = $derived.by(() => {
        const cpu = stats ? stats.cpu_absolute : 0;
        const memory = stats ? stats.memory_bytes / 1024 : 0;
        const disk = stats ? stats.disk_bytes / 1024 : 0;

        const memoryLimit = memoryLimitMiB * 1024;
        const diskLimit = diskLimitMiB * 1024;

        return [
            {
                icon: Cpu,
                title: 'CPU 负载',
                value: offline ? '离线' : stats ? `${cpu.toFixed(2)}%` : '—',
                used: cpu,
                limit: cpuLimit,
                limitLabel: cpuLimit ? `${cpuLimit}%` : undefined,
                text: stats ? `${cpu.toFixed(2)}%，上限 ${cpuLimit || '不限'}` : '暂无数据',
            },
            {
                icon: MemoryStick,
                title: '内存',
                value: offline ? '离线' : stats ? bytesToString(stats.memory_bytes) : '—',
                used: memory,
                limit: memoryLimit,
                limitLabel: memoryLimitMiB ? bytesToString(mbToBytes(memoryLimitMiB)) : undefined,
                text: stats
                    ? `${bytesToString(stats.memory_bytes)}，上限 ${memoryLimitMiB ? bytesToString(mbToBytes(memoryLimitMiB)) : '不限'}`
                    : '暂无数据',
            },
            {
                icon: HardDrive,
                title: '磁盘',
                value: offline ? '离线' : stats ? bytesToString(stats.disk_bytes) : '—',
                used: disk,
                limit: diskLimit,
                limitLabel: diskLimitMiB ? bytesToString(mbToBytes(diskLimitMiB)) : undefined,
                text: stats
                    ? `${bytesToString(stats.disk_bytes)}，上限 ${diskLimitMiB ? bytesToString(mbToBytes(diskLimitMiB)) : '不限'}`
                    : '暂无数据',
            },
        ];
    });
</script>

{#snippet heading(Icon: Component<{ class?: string }>, title: string)}
    <div class="flex min-w-0 items-center gap-2">
        <div class="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
            <Icon class="size-5 text-primary"></Icon>
        </div>
        <p class="font-header text-2xs leading-tight text-muted-foreground md:text-xs">{title}</p>
    </div>
{/snippet}

<div class="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-5">
    <button
        type="button"
        class="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-start transition-colors hover:border-accent-foreground/30 md:px-4 md:py-3"
        onclick={copyAddress}
        title="点击复制连接地址"
    >
        {@render heading(Globe, '地址')}
        <div class="min-w-0 truncate font-semibold">
            {allocation.display}
            {#if copied}<span class="ml-1 text-2xs font-normal text-success">已复制</span>{/if}
        </div>
    </button>

    <div class="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 md:px-4 md:py-3">
        {@render heading(Clock, '运行时间')}
        <div class="min-w-0 truncate font-semibold {uptimeTone ?? ''}">{uptimeLabel}</div>
    </div>

    {#each resources as resource (resource.title)}
        <div class="flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 md:px-4 md:py-3">
            {@render heading(resource.icon, resource.title)}
            <div class="min-w-0">
                <div class="flex min-w-0 items-baseline truncate font-semibold {usageTone(resource.used, resource.limit) ?? ''}">
                    <span class="truncate">{resource.value}</span>
                    {#if resource.limitLabel !== undefined}
                        <span class="select-none text-[70%] font-normal text-muted-foreground">
                            &nbsp;/ {resource.limitLabel || '∞'}
                        </span>
                    {/if}
                </div>
                {#if resource.limit > 0}
                    <Meter
                        class="mt-2"
                        value={resource.used}
                        max={resource.limit}
                        fillClass={meterTone(resource.used, resource.limit)}
                        aria-label={resource.title}
                        aria-valuetext={resource.text}
                    />
                {/if}
            </div>
        </div>
    {/each}
</div>
