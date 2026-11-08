<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { differenceInCalendarDays, eachDayOfInterval, format, startOfDay, subDays } from 'date-fns';
    import { ArrowRight, Check, CircleCheck, CircleDashed, CircleX, Clock, Ellipsis } from '@lucide/svelte';
    import { adminBillingKeys, getBillingAnalytics } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import { formatMoney } from '$features/dashboard/billing/money';
    import StripeKeyDialog from '../settings/StripeKeyDialog.svelte';

    /**
     * Billing overview, ported from overview/OverviewContainer.tsx, SuccessChart.tsx and
     * RevenueChart.tsx. Differences: the legacy page opened the Stripe dialog on every
     * visit while no key was saved; it is a banner with a button here. The conversion rate
     * read "NaN%" with no orders in range. The status doughnut is a single stacked bar
     * with a labelled legend, and revenue per day is a column chart.
     */
    const analytics = createQuery(() => ({ queryKey: adminBillingKeys.analytics, queryFn: getBillingAnalytics }));
    const billing = $derived(app.flags!.billing);

    const ranges = [
        { days: 7, label: '最近 7 天' },
        { days: 14, label: '最近 14 天' },
        { days: 30, label: '最近 1 个月' },
        { days: 60, label: '最近 2 个月' },
        { days: 90, label: '最近 3 个月' },
        { days: 180, label: '最近 6 个月' },
        { days: 360, label: '最近 1 年' },
    ];
    let history = $state(14);
    let stripeOpen = $state(false);

    const stats = $derived.by(() => {
        const orders = analytics.data?.orders;
        if (!orders) return null;

        const now = new Date();
        const inRange = orders.filter(o => differenceInCalendarDays(now, o.createdAt) <= history);
        const processed = inRange.filter(o => o.status === 'processed');
        const revenue = processed.reduce((sum, o) => sum + o.total, 0);

        const byDay = new Map<string, number>();
        for (const o of processed) {
            const key = format(o.createdAt, 'yyyy-MM-dd');
            byDay.set(key, (byDay.get(key) ?? 0) + o.total);
        }
        const days = eachDayOfInterval({ start: startOfDay(subDays(now, history)), end: now }).map(d => {
            const date = format(d, 'yyyy-MM-dd');
            return { date, total: Math.round((byDay.get(date) ?? 0) * 100) / 100 };
        });

        const count = (...s: string[]) => inRange.filter(o => s.includes(o.status)).length;

        return {
            total: inRange.length,
            processed: processed.length,
            revenue,
            days,
            // Status colours from the dataviz reference status palette; each segment
            // also has an icon, label and count in the legend.
            statuses: [
                { label: '已完成', count: processed.length, color: '#0ca30c', icon: CircleCheck },
                { label: '待支付 / 处理中', count: count('pending', 'processing'), color: '#fab219', icon: Clock },
                { label: '失败', count: count('failed'), color: '#d03b3b', icon: CircleX },
                { label: '已过期', count: count('expired'), color: '#8a8a86', icon: CircleDashed },
            ],
        };
    });

    const conversion = $derived(stats && stats.total ? `${((stats.processed / stats.total) * 100).toFixed(1)}%` : '—');
    const hasProducts = $derived((analytics.data?.productCount ?? 0) > 0);
    const hasOrders = $derived((analytics.data?.orders.length ?? 0) > 0);

    const steps = $derived([
        { label: '启用计费模块', done: true, href: null },
        { label: '添加第一个商品', done: hasProducts, href: '/admin/billing/categories' },
        { label: '填写 Stripe API 密钥', done: billing.keys.secret, href: '/admin/billing/settings' },
        { label: '完成第一笔订单', done: hasOrders, href: '/admin/billing/orders' },
    ]);
    const nextStep = $derived(steps.findIndex(s => !s.done));

    const chart = import('./RevenueChart.svelte');
    let tableOpen = $state(false);
</script>

<StripeKeyDialog bind:open={stripeOpen} />

{#if !billing.keys.secret}
    <Alert variant="warning" title="还没有配置 Stripe" class="mb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
            <span>在填写 Stripe API 密钥之前，用户可以浏览商店，但无法完成付款。</span>
            {#if app.can('billing.update')}
                <Button size="sm" onclick={() => (stripeOpen = true)}>填写密钥</Button>
            {/if}
        </div>
    </Alert>
{/if}

{#if analytics.error}
    <Alert variant="destructive">{httpErrorToHuman(analytics.error)}</Alert>
{:else if !stats}
    <Spinner centered />
{:else}
    <div class="grid gap-4 lg:grid-cols-4">
        <div class="space-y-4">
            <select
                bind:value={history}
                aria-label="统计范围"
                class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                {#each ranges as range (range.days)}
                    <option value={range.days}>{range.label}</option>
                {/each}
            </select>
            <Card>
                <CardHeader><CardTitle>建议操作</CardTitle></CardHeader>
                <CardContent>
                    <ol class="space-y-3 text-sm">
                        {#each steps as step, i (step.label)}
                            <li class="flex items-center gap-2">
                                <span
                                    class={cn(
                                        'flex size-6 shrink-0 items-center justify-center rounded-full',
                                        step.done ? 'bg-success/15 text-success' : i === nextStep ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                                    )}
                                >
                                    {#if step.done}<Check class="size-3.5" />{:else if i === nextStep}<ArrowRight class="size-3.5" />{:else}<Ellipsis class="size-3.5" />{/if}
                                </span>
                                {#if step.href && !step.done}
                                    <Link href={step.href} class="hover:underline">{step.label}</Link>
                                {:else}
                                    <span class={step.done ? 'text-muted-foreground' : ''}>{step.label}</span>
                                {/if}
                            </li>
                        {/each}
                    </ol>
                </CardContent>
            </Card>
        </div>

        <div class="space-y-4 lg:col-span-3">
            <div class="grid gap-4 sm:grid-cols-3">
                <Card class="p-4">
                    <p class="text-sm text-muted-foreground">总收入</p>
                    <p class="mt-1 text-2xl font-semibold">{formatMoney(stats.revenue)}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{stats.processed} 笔已完成订单</p>
                </Card>
                <Card class="p-4">
                    <p class="text-sm text-muted-foreground">转化率</p>
                    <p class="mt-1 text-2xl font-semibold">{conversion}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{stats.total} 笔订单中 {stats.processed} 笔已完成</p>
                </Card>
                <Card class="p-4">
                    <p class="text-sm text-muted-foreground">订单数</p>
                    <p class="mt-1 text-2xl font-semibold">{stats.total}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{ranges.find(r => r.days === history)?.label}</p>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>订单状态</CardTitle></CardHeader>
                <CardContent class="space-y-3">
                    {#if stats.total}
                        <div class="flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="订单状态分布，数值见图例">
                            {#each stats.statuses.filter(s => s.count) as s (s.label)}
                                <div class="h-full" style:width="{(s.count / stats.total) * 100}%" style:background-color={s.color} title="{s.label}：{s.count}"></div>
                            {/each}
                        </div>
                    {:else}
                        <div class="h-3 w-full rounded-full bg-muted"></div>
                    {/if}
                    <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        {#each stats.statuses as s (s.label)}
                            {@const Icon = s.icon}
                            <li class="flex items-center gap-1.5">
                                <Icon class="size-4" style="color: {s.color}" aria-hidden="true" />
                                <span class="text-muted-foreground">{s.label}</span>
                                <span class="font-medium tabular-nums">{s.count}</span>
                                {#if stats.total}<span class="text-xs text-muted-foreground tabular-nums">({((s.count / stats.total) * 100).toFixed(0)}%)</span>{/if}
                            </li>
                        {/each}
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader class="flex flex-row items-center justify-between gap-2">
                    <CardTitle>每日收入（{billing.currency.code?.toUpperCase()}）</CardTitle>
                    <Button variant="ghost" size="sm" aria-expanded={tableOpen} onclick={() => (tableOpen = !tableOpen)}>
                        {tableOpen ? '隐藏表格' : '查看表格'}
                    </Button>
                </CardHeader>
                <CardContent>
                    {#await chart}
                        <div class="flex h-64 items-center justify-center"><Spinner /></div>
                    {:then { default: RevenueChart }}
                        <RevenueChart days={stats.days} format={formatMoney} />
                    {:catch}
                        <p class="text-sm text-muted-foreground">图表加载失败，请使用表格查看。</p>
                    {/await}
                    {#if tableOpen}
                        {@const earning = stats.days.filter(d => d.total > 0)}
                        <table class="mt-4 w-full text-sm">
                            <thead class="border-b border-border text-left text-xs text-muted-foreground">
                                <tr><th scope="col" class="py-2 font-medium">日期</th><th scope="col" class="py-2 text-right font-medium">收入</th></tr>
                            </thead>
                            <tbody class="divide-y divide-border">
                                {#each earning as d (d.date)}
                                    <tr><td class="py-2">{d.date}</td><td class="py-2 text-right tabular-nums">{formatMoney(d.total)}</td></tr>
                                {:else}
                                    <tr><td colspan="2" class="py-4 text-center text-muted-foreground">这段时间没有收入。</td></tr>
                                {/each}
                            </tbody>
                        </table>
                    {/if}
                </CardContent>
            </Card>
        </div>
    </div>
{/if}
