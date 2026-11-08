<script lang="ts">
    import { onMount } from 'svelte';
    import * as echarts from 'echarts';
    import { ArrowDownToLine, ArrowUpFromLine } from '@lucide/svelte';
    import { theme } from '$lib/stores/theme.svelte';
    import { app } from '$lib/stores/app.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent, type SocketStats } from '$lib/api/definitions/events';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { bytesToString } from '$lib/utils/format';

    /**
     * CPU / memory / network sparklines, ported from StatGraphs.tsx. The legacy
     * implementation kept a 20-slot Chart.js window pre-filled with -5 (values below the
     * axis floor so the line rises in from the bottom); this reproduces the same visual
     * with ECharts, which the new bundle already ships.
     */
    let { store }: { store: ServerStore } = $props();

    const SLOTS = 20;
    const PRIMARY = app.theme?.colors?.primary ?? '#38bdf8';
    const CYAN = '#22d3ee';

    // Unlike Chart.js (which clips values below the axis floor), ECharts expands the
    // axis to include negative points and renders the area under zero — so empty
    // windows are null-filled instead of the legacy -5 trick.
    const empty = () => Array(SLOTS).fill(null) as (number | null)[];

    let cpuEl: HTMLDivElement;
    let memoryEl: HTMLDivElement;
    let networkEl: HTMLDivElement;

    let cpu = $state<(number | null)[]>(empty());
    let memory = $state<(number | null)[]>(empty());
    let networkIn = $state<(number | null)[]>(empty());
    let networkOut = $state<(number | null)[]>(empty());

    let previous = { tx: -1, rx: -1 };

    const slide = (data: (number | null)[], value: number): (number | null)[] => [
        ...data.slice(1),
        Number(value.toFixed(2)),
    ];

    // Network series are deltas between consecutive stats pushes; the first sample has
    // no baseline and reads as zero, matching the legacy previous ref.
    websocketEvent(store, SocketEvent.STATS, (raw: string) => {
        let values: SocketStats;
        try {
            values = JSON.parse(raw) as SocketStats;
        } catch {
            return;
        }

        cpu = slide(cpu, values.cpu_absolute);
        memory = slide(memory, Math.floor(values.memory_bytes / 1024 / 1024));
        networkIn = slide(networkIn, previous.tx < 0 ? 0 : Math.max(0, values.network.tx_bytes - previous.tx));
        networkOut = slide(networkOut, previous.rx < 0 ? 0 : Math.max(0, values.network.rx_bytes - previous.rx));

        previous = { tx: values.network.tx_bytes, rx: values.network.rx_bytes };
    });

    // An offline server has nothing to plot; reset the windows so stale lines vanish.
    $effect(() => {
        if (store.status === 'offline') {
            cpu = empty();
            memory = empty();
            networkIn = empty();
            networkOut = empty();
            previous = { tx: -1, rx: -1 };
        }
    });

    function makeOption(
        series: { data: (number | null)[]; color: string; fillOpacity?: number }[],
        yMax?: number,
        tick?: (v: number) => string,
    ) {
        return {
            animation: false,
            grid: { left: 4, right: 8, top: 6, bottom: 4, containLabel: false },
            xAxis: { type: 'category' as const, show: false, data: Array.from({ length: SLOTS }, (_, i) => i) },
            yAxis: {
                type: 'value' as const,
                min: 0,
                ...(yMax ? { max: yMax } : {}),
                splitNumber: 2,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    show: true,
                    fontSize: 10,
                    color: theme.resolved === 'dark' ? '#94a3b8' : '#64748b',
                    formatter: (value: number) => (tick ? tick(value) : bytesToString(value, 1)),
                },
                splitLine: {
                    show: true,
                    lineStyle: { color: theme.resolved === 'dark' ? '#1e293b' : '#e2e8f0' },
                },
            },
            series: series.map(s => ({
                type: 'line' as const,
                data: s.data,
                smooth: 0.15,
                showSymbol: false,
                lineStyle: { width: 1.5, color: s.color },
                itemStyle: { color: s.color },
                areaStyle: s.fillOpacity ? { opacity: s.fillOpacity } : undefined,
            })),
        };
    }

    let cpuChart: echarts.ECharts;
    let memoryChart: echarts.ECharts;
    let networkChart: echarts.ECharts;

    onMount(() => {
        cpuChart = echarts.init(cpuEl);
        memoryChart = echarts.init(memoryEl);
        networkChart = echarts.init(networkEl);

        const observer = new ResizeObserver(() => {
            cpuChart?.resize();
            memoryChart?.resize();
            networkChart?.resize();
        });
        observer.observe(cpuEl);
        observer.observe(memoryEl);
        observer.observe(networkEl);

        return () => {
            observer.disconnect();
            cpuChart?.dispose();
            memoryChart?.dispose();
            networkChart?.dispose();
        };
    });

    $effect(() => {
        cpuChart?.setOption(makeOption([{ data: cpu, color: PRIMARY, fillOpacity: 0.5 }], store.server?.limits.cpu, v => `${v}%`));
    });

    $effect(() => {
        memoryChart?.setOption(
            makeOption([{ data: memory, color: PRIMARY, fillOpacity: 0.5 }], store.server?.limits.memory, v => `${v} MiB`),
        );
    });

    $effect(() => {
        networkChart?.setOption(
            makeOption(
                [
                    { data: networkIn, color: CYAN, fillOpacity: 0.5 },
                    { data: networkOut, color: PRIMARY, fillOpacity: 0.5 },
                ],
                undefined,
                value => bytesToString(value, 1),
            ),
        );
    });

    const blockTitle = 'flex items-center justify-between px-4 pt-3 pb-1';
</script>

<div class="grid gap-2">
    <div class="rounded-lg border border-border bg-card">
        <div class={blockTitle}><h3 class="text-xs font-semibold text-muted-foreground">CPU</h3></div>
        <div bind:this={cpuEl} class="h-20 w-full"></div>
    </div>

    <div class="rounded-lg border border-border bg-card">
        <div class={blockTitle}><h3 class="text-xs font-semibold text-muted-foreground">内存</h3></div>
        <div bind:this={memoryEl} class="h-20 w-full"></div>
    </div>

    <div class="rounded-lg border border-border bg-card">
        <div class={blockTitle}>
            <h3 class="text-xs font-semibold text-muted-foreground">网络</h3>
            <p class="flex items-center gap-2 text-muted-foreground">
                <ArrowDownToLine class="size-3.5 text-cyan-400" aria-label="入站" />
                <ArrowUpFromLine class="size-3.5 text-primary" aria-label="出站" />
            </p>
        </div>
        <div bind:this={networkEl} class="h-20 w-full"></div>
    </div>
</div>
