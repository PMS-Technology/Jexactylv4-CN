<script lang="ts">
    import type { Component } from 'svelte';
    import { Bug, Cpu, Link as LinkIcon, ShieldCheck, SlidersHorizontal } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import Link from '$lib/components/Link.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import GeneralSettings from './GeneralSettings.svelte';
    import CaptchaSettings from './CaptchaSettings.svelte';
    import ModeSettings from './ModeSettings.svelte';
    import WebhookSettings from './WebhookSettings.svelte';
    import DebugSettings from './DebugSettings.svelte';

    /** Settings tabs, ported from SettingsRouter.tsx and WebhookRouter.tsx. */
    const tabs: { path: string; name: string; icon: Component<any>; page: Component<any>; permission: string }[] = [
        { path: '', name: '核心', icon: Cpu, page: GeneralSettings, permission: 'settings.read' },
        { path: 'mode', name: '模式', icon: SlidersHorizontal, page: ModeSettings, permission: 'settings.read' },
        { path: 'captcha', name: '验证码', icon: ShieldCheck, page: CaptchaSettings, permission: 'settings.read' },
        { path: 'webhooks', name: 'Webhooks', icon: LinkIcon, page: WebhookSettings, permission: 'webhooks.read' },
        { path: 'debug', name: '调试', icon: Bug, page: DebugSettings, permission: 'settings.read' },
    ];

    const sub = $derived(router.pathname.replace(/^\/admin\/settings\/?/, '').replace(/\/+$/, ''));
    const current = $derived(tabs.find(t => t.path === sub.split('/')[0]));
    const visibleTabs = $derived(tabs.filter(t => app.can(t.permission)));
</script>

<svelte:head>
    <title>设置 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="设置" description="配置和管理 {app.settings?.name ?? 'Panel'} 的设置。" />

    <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="设置分类">
        {#each visibleTabs as tab (tab.path)}
            {@const Icon = tab.icon}
            <Link
                href={tab.path ? `/admin/settings/${tab.path}` : '/admin/settings'}
                end
                class="-mb-px inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground"
                activeClass="border-primary! text-foreground font-medium"
            >
                <Icon class="size-4" />{tab.name}
            </Link>
        {/each}
    </nav>

    {#if !current}
        <NotFound backTo="/admin/settings" />
    {:else if !app.can(current.permission)}
        <p class="text-sm text-destructive">你没有权限访问此页面。</p>
    {:else}
        {@const Page = current.page}
        <Page />
    {/if}
</div>
