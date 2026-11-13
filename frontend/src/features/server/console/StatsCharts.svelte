<script lang="ts">
    import { onMount } from 'svelte';
    import * as echarts from 'echarts';
    import { ArrowDownToLine, ArrowUpFromLine } from '@lucide/svelte';
    import { theme } from '$lib/stores/theme.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { SocketEvent, type SocketStats } from '$lib/api/definitions/events';
    import { websocketEvent } from '$lib/stores/server.svelte';
    import { bytesToString } from '$lib/utils/format';
    import { SegmentedRadio } from '$lib/ui';

    /**
     * CPU / memory / network sparklines, ported from StatGraphs.tsx. The legacy
     * implementation kept a 20-slot Chart.js window pre-filled with -5 (values below the
     * axis floor so the line rises in from the bottom); this reproduces the same visual
     * with ECharts, which the new bundle already ships.
     *
     * The three resources share one chart with a segmented control above it, rather
     * than being stacked in three separate cards: they are the same chart over
     * different metrics, so showing one at a time keeps the rail short and lets the
     * plot have room to breathe. The control carries the live value of each resource,
     * so the current number is visible without switching.
     *
     * The series colours come from the chart tokens in `app.css`, not from the
     * administrator's brand colour: a brand hue is a single colour and cannot be
     * told apart from another series on the same chart.
     */
    let { store }: { store: ServerStore } = $props();

    const SLOTS = 20;

    /**
     * The series colours are read from the CSS so they follow the light and dark
     * surfaces; the chart is drawn on a canvas, so it cannot use the classes
     * directly. The values mirror `--color-chart-1` and `--color-chart-2`.
     */
    const SERIES = {
        light: { one: '#2a78d6', two: '#eb6834', grid: '#e1e0d9', axis: '#71717b' },
        dark: { one: '#3987e5', two: '#c94a1c', grid: '#2c2c2a', axis: '#9f9fa9' },
    };

    const palette = $derived(theme.resolved === 'dark' ? SERIES.dark : SERIES.light);

    // Unlike Chart.js (which clips values below the axis floor), ECharts expands the
    // axis to include negative points and renders the area under zero — so empty
    // windows are null-filled instead of the legacy -5 trick.
    const empty = () => Array(SLOTS).fill(null) as (number | null)[];

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

    /** The value a series shows at its most recent slot, for the control's labels. */
    const latest = (data: (number | null)[]): number | null => {
        for (let i = data.length - 1; i >= 0; i--) {
            const value = data[i];
            if (value !== null && value !== undefined) return value;
        }

        return null;
    };

    const cpuLatest = $derived(latest(cpu));
    const memoryLatest = $derived(latest(memory));
    const inLatest = $derived(latest(networkIn));
    const outLatest = $derived(latest(networkOut));

    /**
     * The resources the control switches between. The control names the resource;
     * the live value is the headline above the chart, so the number is read without
     * having to interpret a label that has to fit a narrow segment.
     */
    const resources = [
        { value: 'cpu', label: 'CPU' },
        { value: 'memory', label: '内存' },
        { value: 'network', label: '网络' },
    ];

    let active = $state('cpu');

    let chartEl: HTMLDivElement | undefined = $state();
    let chart = $state<echarts.ECharts | undefined>(undefined);

    onMount(() => {
        const el = chartEl;
        if (!el) return;

        const instance = echarts.init(el);
        chart = instance;

        const observer = new ResizeObserver(() => instance.resize());
        observer.observe(el);

        const onResize = () => instance.resize();
        window.addEventListener('resize', onResize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', onResize);
            instance.dispose();
            if (chart === instance) chart = undefined;
        };
    });

    function makeOption(
        series: { data: (number | null)[]; color: string }[],
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
                    color: palette.axis,
                    formatter: (value: number) => (tick ? tick(value) : bytesToString(value, 1)),
                },
                splitLine: {
                    show: true,
                    lineStyle: { color: palette.grid },
                },
            },
            series: series.map(s => ({
                type: 'line' as const,
                data: s.data,
                smooth: 0.15,
                showSymbol: false,
                lineStyle: { width: 2, color: s.color },
                itemStyle: { color: s.color },
                areaStyle: { opacity: 0.14 },
            })),
        };
    }

    // The option follows the selected resource: one series for CPU and memory, two for
    // the network, which share a unit and so share an axis.
    $effect(() => {
        const instance = chart;
        if (!instance) return;

        if (active === 'cpu') {
            instance.setOption(
                makeOption([{ data: cpu, color: palette.one }], store.server?.limits.cpu || undefined, v => `${v}%`),
                true,
            );
        } else if (active === 'memory') {
            instance.setOption(
                makeOption(
                    [{ data: memory, color: palette.one }],
                    store.server?.limits.memory || undefined,
                    v => `${v} MiB`,
                ),
                true,
            );
        } else {
            instance.setOption(
                makeOption(
                    [
                        { data: networkIn, color: palette.one },
                        { data: networkOut, color: palette.two },
                    ],
                    undefined,
                    value => bytesToString(value, 1),
                ),
                true,
            );
        }
    });
</script>

<div class="flex w-full flex-col rounded-lg border border-border bg-card p-3">
    <SegmentedRadio
        items={resources}
        bind:value={active}
        columns={3}
        class="mb-3"
        itemClass="px-1 text-2xs whitespace-nowrap"
        aria-label="资源"
    />

    <!-- The live value of the selected resource. It is the number the chart is
         about, so it is the headline rather than an axis label. -->
    <div class="mb-1 flex items-baseline gap-2 px-1">
        <span class="font-header text-lg font-semibold">
            {#if active === 'cpu'}
                {cpuLatest !== null ? `${cpuLatest}%` : '—'}
            {:else if active === 'memory'}
                {memoryLatest !== null ? `${memoryLatest} MiB` : '—'}
            {:else}
                <span class="text-base font-medium">网络</span>
            {/if}
        </span>
        <span class="text-2xs text-muted-foreground">
            {#if active === 'cpu'}
                最近 20 次采样
            {:else if active === 'memory'}
                最近 20 次采样
            {:else}
                最近 20 次采样的增量
            {/if}
        </span>
    </div>

    {#if active === 'network'}
        <!-- Two series, so the legend is always present; it carries the live value of
             each series, which is the direct label. -->
        <div class="flex items-center gap-3 px-1 pb-1">
            <span class="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
                <ArrowDownToLine class="size-3.5" color={palette.one} aria-hidden="true" />
                入站
                <span class="font-medium text-foreground">
                    {inLatest !== null ? bytesToString(inLatest, 1) : '—'}
                </span>
            </span>
            <span class="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
                <ArrowUpFromLine class="size-3.5" color={palette.two} aria-hidden="true" />
                出站
                <span class="font-medium text-foreground">
                    {outLatest !== null ? bytesToString(outLatest, 1) : '—'}
                </span>
            </span>
        </div>
    {/if}

    <div bind:this={chartEl} class="min-h-24 w-full flex-1"></div>
</div>
