<script lang="ts">
    import { onMount } from 'svelte';
    import * as echarts from 'echarts';
    import { theme } from '$lib/stores/theme.svelte';

    /**
     * Daily revenue from processed orders, one column per day. Replaces the legacy
     * Chart.js line (RevenueChart.tsx): revenue arrives on a few days with gaps between,
     * which a line draws as slopes that never happened. Lazy-loaded by OverviewTab so
     * the ECharts chunk stays off every other billing page.
     */
    let { days, format }: { days: { date: string; total: number }[]; format: (v: number) => string } = $props();

    let el: HTMLDivElement;
    let chart: echarts.ECharts | undefined;

    // Reference categorical slot 1, stepped per mode (dataviz palette; validated ≥ 3:1).
    const series = $derived(theme.resolved === 'dark' ? '#3987e5' : '#2a78d6');
    const muted = $derived(theme.resolved === 'dark' ? '#9f9fa9' : '#71717b');
    const grid = $derived(theme.resolved === 'dark' ? '#27272a' : '#e4e4e7');
    const surface = $derived(theme.resolved === 'dark' ? '#18181b' : '#ffffff');
    const ink = $derived(theme.resolved === 'dark' ? '#fafafa' : '#18181b');

    onMount(() => {
        chart = echarts.init(el);
        const observer = new ResizeObserver(() => chart?.resize());
        observer.observe(el);

        return () => {
            observer.disconnect();
            chart?.dispose();
        };
    });

    $effect(() => {
        chart?.setOption(
            {
                animation: false,
                grid: { left: 8, right: 8, top: 12, bottom: 4, containLabel: true },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow', shadowStyle: { color: grid, opacity: 0.5 } },
                    backgroundColor: surface,
                    borderColor: grid,
                    textStyle: { color: ink, fontSize: 12 },
                    formatter: (items: { name: string; value: number }[]) => {
                        const item = items[0]!;
                        return `<strong>${format(item.value)}</strong><br/><span style="color:${muted}">${item.name}</span>`;
                    },
                },
                xAxis: {
                    type: 'category',
                    data: days.map(d => d.date),
                    axisLine: { lineStyle: { color: grid } },
                    axisTick: { show: false },
                    axisLabel: { color: muted, fontSize: 11, formatter: (v: string) => v.slice(5), hideOverlap: true },
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    splitNumber: 4,
                    minInterval: 1,
                    axisLabel: { color: muted, fontSize: 11 },
                    splitLine: { lineStyle: { color: grid, width: 1 } },
                },
                series: [
                    {
                        type: 'bar',
                        data: days.map(d => d.total),
                        barMaxWidth: 24,
                        itemStyle: { color: series, borderRadius: [4, 4, 0, 0] },
                        emphasis: { disabled: true },
                    },
                ],
            },
            true,
        );
    });
</script>

<div bind:this={el} class="h-64 w-full" role="img" aria-label="每日收入柱状图，数据见下方表格"></div>
