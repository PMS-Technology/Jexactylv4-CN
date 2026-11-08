<script lang="ts">
    import { Clock, Cpu, Globe, HardDrive, MemoryStick } from '@lucide/svelte';
    import type { Component } from 'svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent, SocketRequest, type SocketStats } from '$lib/api/definitions/events';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { bytesToString, formatIp, formatUptime, mbToBytes } from '$lib/utils/format';

    /**
     * The live resource strip, ported from ServerDetailsBlock.tsx: address, uptime,
     * CPU, memory and disk, fed by the socket's `stats` event (requested once on
     * connect via `send stats`).
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

    /** Ported threshold colouring: >80% amber, >90% red. */
    function usageTone(value: number, max: number | null | undefined): string | undefined {
        if (!max) return undefined;
        const delta = value / max;

        if (delta > 0.9) return 'text-red-500';
        if (delta > 0.8) return 'text-amber-500';

        return undefined;
    }

    /**
     * Ported from the legacy uptime block: running is neutral, anything not offline
     * (starting/stopping) is amber, offline is red.
     */
    const uptimeTone = $derived(
        store.status === null ? 'text-red-500' : store.status === 'running' ? undefined : 'text-amber-500',
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

    /**
     * Port of the legacy useFitText ({minFontSize: 8}): shrinks the value until it
     * fits its column instead of ellipsising it — address tiles are narrow on small
     * viewports and CJK addresses don't break. The overflow lives on the inner
     * truncate span, so that is the element measured.
     */
    function fittext(node: HTMLElement) {
        const fit = () => {
            const inner = node.firstElementChild as HTMLElement | null;
            if (!inner) return;

            node.style.fontSize = '';
            let size = parseFloat(getComputedStyle(node).fontSize);
            while (inner.scrollWidth > inner.clientWidth && size > 8) {
                size -= 0.5;
                node.style.fontSize = `${size}px`;
            }
        };

        fit();
        const observer = new ResizeObserver(fit);
        observer.observe(node);

        return { destroy: () => observer.disconnect() };
    }
</script>

{#snippet block(Icon: Component<{ class?: string }>, title: string, tone: string | undefined, value: string, limit?: string, onclick?: () => void)}
    <div
        class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 md:px-4 md:py-3 {onclick
            ? 'cursor-pointer select-none transition-colors hover:border-accent-foreground/30'
            : ''}"
        onclick={onclick}
        role={onclick ? 'button' : undefined}
        tabindex={onclick ? 0 : undefined}
        onkeydown={onclick ? (e) => e.key === 'Enter' && onclick() : undefined}
    >
        <div class="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-muted sm:flex">
            <Icon class="size-5 text-primary"></Icon>
        </div>
        <div class="flex min-w-0 flex-1 flex-col justify-center">
            <p class="font-header text-2xs leading-tight text-muted-foreground md:text-xs">
                {title}{#if copied}<span class="ml-1 text-success">已复制</span>{/if}
            </p>
            <div class="flex min-w-0 items-center truncate font-semibold {tone ?? ''}" use:fittext>
                <span class="truncate">{value}</span>
                {#if limit !== undefined}
                    <span class="select-none text-[70%] font-normal text-muted-foreground">&nbsp;/ {limit || '∞'}</span>
                {/if}
            </div>
        </div>
    </div>
{/snippet}

<div class="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-5 md:gap-4">
    {@render block(Globe, '地址', undefined, allocation.display, undefined, copyAddress)}
    {@render block(
        Clock,
        '运行时间',
        uptimeTone,
        uptimeLabel,
    )}
    {@render block(
        Cpu,
        'CPU 负载',
        stats ? usageTone(stats.cpu_absolute, store.server?.limits.cpu) : undefined,
        store.status === 'offline' ? '离线' : stats ? `${stats.cpu_absolute.toFixed(2)}%` : '—',
        store.server?.limits.cpu ? `${store.server.limits.cpu}%` : undefined,
    )}
    {@render block(
        MemoryStick,
        '内存',
        stats ? usageTone(stats.memory_bytes / 1024, store.server?.limits.memory ? store.server.limits.memory * 1024 : null) : undefined,
        store.status === 'offline' ? '离线' : stats ? bytesToString(stats.memory_bytes) : '—',
        store.server?.limits.memory ? bytesToString(mbToBytes(store.server.limits.memory)) : undefined,
    )}
    {@render block(
        HardDrive,
        '磁盘',
        stats ? usageTone(stats.disk_bytes / 1024, store.server?.limits.disk ? store.server.limits.disk * 1024 : null) : undefined,
        stats ? bytesToString(stats.disk_bytes) : '—',
        store.server?.limits.disk ? bytesToString(mbToBytes(store.server.limits.disk)) : undefined,
    )}
</div>
