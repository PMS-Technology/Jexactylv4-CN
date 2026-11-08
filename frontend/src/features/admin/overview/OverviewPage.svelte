<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import {
        ArrowRight,
        ChartLine,
        CircleHelp,
        Coins,
        Database,
        Heart,
        Layers,
        Monitor,
        RefreshCw,
        Save,
        Server,
        Ticket,
        UserPlus,
        Users,
    } from '@lucide/svelte';
    import { getMetrics, getVersion } from '$lib/api/admin/general';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Card, CardContent, CardHeader, CardTitle, Spinner } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import Link from '$lib/components/Link.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';

    /** Admin overview, ported from OverviewContainer.tsx. */
    const version = createQuery(() => ({ queryKey: ['admin', 'version'], queryFn: getVersion, staleTime: 10 * 60_000 }));
    const metrics = createQuery(() => ({ queryKey: ['admin', 'metrics'], queryFn: getMetrics }));

    const symbol = $derived(app.flags?.billing.currency.symbol ?? '');

    const stats = $derived.by(() => {
        const m = metrics.data;
        if (!m) return [];

        const serverNotes = [
            m.servers.suspended > 0 && `${m.servers.suspended} 台已暂停`,
            m.servers.installing > 0 && `${m.servers.installing} 台安装中`,
        ].filter(Boolean);

        return [
            { icon: Layers, title: '节点', value: m.nodes },
            { icon: Server, title: '服务器', value: m.servers.total, subtext: serverNotes.join('，') || undefined },
            { icon: Users, title: '用户', value: m.users.total, subtext: `${m.users.admins} 名管理员` },
            { icon: Ticket, title: '待处理工单', value: m.tickets },
            { icon: Database, title: '数据库', value: m.databases },
            { icon: Save, title: '备份', value: m.backups },
            ...(m.billing
                ? [
                      {
                          icon: Coins,
                          title: '营收',
                          value: `${symbol}${m.billing.revenue.toFixed(2)}`,
                          subtext: `本月 ${m.billing.orders_this_month} 笔订单`,
                      },
                      {
                          icon: CircleHelp,
                          title: '待支付订单',
                          value: m.billing.orders_pending,
                          subtext: `共 ${m.billing.products} 个套餐`,
                      },
                  ]
                : []),
        ];
    });

    const suggestions = $derived.by(() => {
        const m = metrics.data;
        const list: { icon: typeof Server; title: string; description: string; href: string; action?: string }[] = [];

        if (!app.settings?.auto_update) {
            list.push({
                icon: RefreshCw,
                href: '/admin/settings',
                title: '启用自动更新',
                description: '开启自动更新后，面板会在后台保持最新与安全。',
            });
        }
        if (!app.flags?.auth.registration.enabled) {
            list.push({
                icon: UserPlus,
                href: '/admin/auth',
                title: '开放用户注册',
                description: '启用认证模块后，用户可以在登录页自行注册。',
            });
        }
        if (m) {
            if (m.nodes < 1) {
                list.push({ icon: Layers, href: '/admin/nodes/new', title: '添加第一个节点', description: '节点是运行服务器的物理机器。' });
            }
            if (m.servers.total < 1) {
                list.push({ icon: Server, href: '/admin/servers/new', title: '创建第一台服务器', description: '创建一台服务器来运行游戏或程序。' });
            }
            if (app.flags?.tickets.enabled && m.tickets > 0) {
                list.push({ icon: Ticket, href: '/admin/tickets', title: '回复用户工单', description: `当前有 ${m.tickets} 个待处理工单。` });
            }
            if (m.billing && m.billing.orders_pending > 0) {
                list.push({
                    icon: Coins,
                    href: '/admin/billing/orders',
                    title: '审核待支付订单',
                    description: `当前有 ${m.billing.orders_pending} 笔待支付订单。`,
                });
            }
        }
        list.push({
            icon: Heart,
            href: 'https://donate.stripe.com/6oE02Zftd9cC34IbIS',
            title: '赞助 Jexactyl',
            description: '捐赠以支持项目的测试服务器与域名开销。',
            action: '赞助',
        });

        return list;
    });
</script>

<svelte:head>
    <title>概览 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="概览" description="快速了解系统状态。" />

    <div class="space-y-6">
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Monitor class="size-4" />版本信息</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                {#if app.settings?.debug}
                    <Alert variant="warning">面板正以调试模式运行，请勿在生产环境使用。</Alert>
                {/if}
                {#if version.error}
                    <Alert variant="destructive">{httpErrorToHuman(version.error)}</Alert>
                {:else if !version.data}
                    <Spinner />
                {:else}
                    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
                        {#each [{ label: '当前版本', value: version.data.panel.current }, { label: '最新版本', value: version.data.panel.latest }] as { label, value } (label)}
                            <span class="inline-flex items-center gap-1.5">
                                {label}
                                <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{value}</code>
                                <CopyButton text={value} label="" />
                            </span>
                        {/each}
                    </div>
                    {#if version.data.panel.current.startsWith('v4.0.0-')}
                        <Alert variant="destructive">你正在使用 Jexactyl v4 测试版，可能存在缺陷。除非不在乎数据丢失，否则请勿用于生产环境。</Alert>
                    {/if}
                {/if}
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><ChartLine class="size-4" />统计</CardTitle></CardHeader>
            <CardContent>
                {#if metrics.error}
                    <Alert variant="destructive">{httpErrorToHuman(metrics.error)}</Alert>
                {:else if !metrics.data}
                    <Spinner centered />
                {:else}
                    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {#each stats as stat (stat.title)}
                            {@const Icon = stat.icon}
                            <div class="rounded-lg bg-muted/50 p-4">
                                <p class="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Icon class="size-4 text-primary" />{stat.title}
                                </p>
                                <p class="mt-1 text-2xl font-semibold">{stat.value}</p>
                                {#if stat.subtext}<p class="mt-1 text-xs text-muted-foreground">{stat.subtext}</p>{/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><CircleHelp class="size-4" />建议操作</CardTitle></CardHeader>
            <CardContent>
                <div class="grid gap-4 lg:grid-cols-3">
                    {#each suggestions as s (s.title)}
                        {@const Icon = s.icon}
                        <div class="flex flex-col rounded-lg bg-muted/50 p-4">
                            <p class="flex items-center gap-2 font-semibold"><Icon class="size-4" />{s.title}</p>
                            <p class="mt-1 flex-1 text-sm text-muted-foreground">{s.description}</p>
                            <Link
                                href={s.href}
                                target={s.href.startsWith('http') ? '_blank' : undefined}
                                rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                                class="mt-2 inline-flex items-center gap-1 self-end text-sm text-primary"
                            >
                                {s.action ?? '前往'} <ArrowRight class="size-3.5" />
                            </Link>
                        </div>
                    {/each}
                </div>
            </CardContent>
        </Card>
    </div>
</div>
