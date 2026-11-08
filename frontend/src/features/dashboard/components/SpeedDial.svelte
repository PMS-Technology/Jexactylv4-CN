<script lang="ts">
    import type { Component } from 'svelte';
    import { fly } from 'svelte/transition';
    import {
        Grid2x2Plus,
        Plus,
        ServerCog,
        Sparkles,
        Ticket,
        UserRoundPlus,
    } from '@lucide/svelte';
    import { cubicOut } from 'svelte/easing';
    import { app } from '$lib/stores/app.svelte';
    import Tooltip from '$lib/ui/tooltip/Tooltip.svelte';

    interface QuickAction {
        icon: Component<{ class?: string }>;
        href: string;
        label: string;
    }

    /**
     * Quick links to the most common admin creation pages, ported from the legacy
     * `elements/SpeedDial.tsx`. AI and tickets follow their feature flags; the rest
     * are always available when the dial itself is enabled.
     */
    const actions = $derived.by(() => {
        const items: QuickAction[] = [];
        if (app.flags?.ai.enabled) {
            items.push({ icon: Sparkles, href: '/admin/ai', label: 'AI 助手' });
        }
        items.push(
            { icon: Grid2x2Plus, href: '/admin/nodes/new', label: '创建节点' },
            { icon: ServerCog, href: '/admin/servers/new', label: '创建服务器' },
            { icon: UserRoundPlus, href: '/admin/users/new', label: '创建用户' },
        );
        if (app.flags?.tickets.enabled) {
            items.push({ icon: Ticket, href: '/admin/tickets', label: '查看工单' });
        }
        return items;
    });

    let open = $state(false);

    const buttonBase = [
        'flex size-12 items-center justify-center rounded-full border border-border bg-popover/80',
        'text-popover-foreground shadow-lg backdrop-blur-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring',
    ].join(' ');
</script>

<!--
    Admin-only and desktop-only, matching the legacy `hidden md:block` — on mobile the
    bottom navigation bar owns the corner. The targets leave the client area for /admin,
    and some (nodes, servers, users) are still legacy pages, so these are plain anchors.
-->
<div class="fixed right-6 bottom-6 z-[9999] hidden md:block">
    {#if open}
        <div class="mb-4 flex flex-col items-center space-y-2">
            {#each actions as action, index (action.href)}
                <div
                    transition:fly={{ y: 12, duration: 160, delay: (actions.length - 1 - index) * 40, easing: cubicOut }}
                >
                    <Tooltip content={action.label} side="left">
                        {#snippet child({ props })}
                            <a href={action.href} {...props} class={buttonBase}>
                                <action.icon class="size-5" />
                            </a>
                        {/snippet}
                    </Tooltip>
                </div>
            {/each}
        </div>
    {/if}

    <button
        type="button"
        class="{buttonBase} shadow-xl transition-transform duration-200 hover:scale-105"
        aria-expanded={open}
        aria-label={open ? '收起快捷操作' : '展开快捷操作'}
        onclick={() => (open = !open)}
    >
        <span class="flex transition-transform duration-200 {open ? 'rotate-135' : ''}">
            <Plus class="size-5" />
        </span>
    </button>
</div>
