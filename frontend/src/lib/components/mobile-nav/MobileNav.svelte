<script lang="ts">
    import type { Snippet } from 'svelte';
    import { DropdownMenu } from 'bits-ui';
    import { ArrowUpRight, Check, ChevronsUpDown, House, LogOut, Monitor, Moon, Search, Settings, Sun } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import { theme, type ColorScheme } from '$lib/stores/theme.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import { logout } from '$lib/api/auth';
    import type { CustomLink } from '$lib/api/links';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';
    import SearchModal from '$features/dashboard/components/SearchModal.svelte';
    import { animateIn, animateOut } from '$lib/motion';
    import MobileNavAction from './MobileNavAction.svelte';

    /**
     * Phone navigation, modelled 1:1 on the Vercel dashboard's mobile menu.
     *
     * Closed, it is a small floating bar centred at the bottom: 搜索 and a menu button.
     * Open, the page dims and a rounded panel rises from the bar. Two capsules above the
     * panel show the current scope (area, then server); the panel lists the area's
     * pages, the account, and utility rows ending with sign-out.
     *
     * Escape, the button, the dimmed page, a navigation, or widening past `md` closes it
     * and returns focus to the button.
     */
    type Area = 'dashboard' | 'admin' | 'server';

    type Props = {
        area: Area;
        /** Second capsule, which opens server search: 全部服务器 on the dashboard, the server's name inside one. */
        scope?: string;
        /** Primary rows (MobileNavItem, MobileNavDivider). */
        primary: Snippet;
        /** Area-specific rows, listed before 主题. */
        actions?: Snippet;
        /** Admin-configured external links, listed before sign-out. */
        links?: CustomLink[];
    };

    let { area, scope, primary, actions, links = [] }: Props = $props();

    let open = $state(false);
    let searchOpen = $state(false);
    let switcherOpen = $state(false);
    let root = $state<HTMLElement>();
    let toggle = $state<HTMLButtonElement>();

    const panelId = $props.id();
    const navLabel = $derived({ dashboard: '主导航', admin: '管理后台导航', server: '服务器导航' }[area]);

    const areaOptions = [
        { value: 'dashboard', label: '控制台' },
        { value: 'admin', label: '管理后台' },
    ] as const;

    const themeOptions: { value: ColorScheme; label: string; icon: typeof Sun }[] = [
        { value: 'system', label: '跟随系统', icon: Monitor },
        { value: 'light', label: '浅色', icon: Sun },
        { value: 'dark', label: '深色', icon: Moon },
    ];

    const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--mn-focus)';

    /**
     * The panel stays in the document while it animates out, so `shown` trails `open`
     * by the length of the closing animation.
     */
    let shown = $state(false);
    let backdrop = $state<HTMLElement | null>(null);
    let panel = $state<HTMLElement | null>(null);

    /** Invalidates a running animation when the menu is reopened. */
    let token = 0;

    $effect(() => {
        if (!open) return;

        shown = true;
    });

    // Runs once the panel is in the document. Reading the element references here is
    // what makes the effect wait for them.
    $effect(() => {
        if (!open || !shown || !backdrop || !panel) return;

        animateIn(backdrop, { duration: 0.2 });
        animateIn(panel, { duration: 0.28, distance: 24 });
    });

    $effect(() => {
        if (open || !shown) return;

        const current = ++token;

        void Promise.all([
            animateOut(backdrop, { duration: 0.18 }),
            animateOut(panel, { duration: 0.2 }),
        ]).then(() => {
            // The menu was reopened while it was closing; leave it alone.
            if (current !== token) return;

            shown = false;
        });
    });

    function close({ restoreFocus = true } = {}) {
        if (!open) return;
        open = false;
        switcherOpen = false;
        if (restoreFocus) toggle?.focus();
    }

    function openSearch() {
        close({ restoreFocus: false });
        searchOpen = true;
    }

    function switchArea(target: 'dashboard' | 'admin') {
        if (target === 'dashboard') {
            navigate('/');
        } else if (area === 'admin') {
            navigate('/admin');
        } else {
            // Same as the desktop sidebar's entry: the admin shell loads as a new document.
            window.location.href = '/admin';
        }
    }

    // A navigation closes the menu; focus goes back to the bar, which persists.
    let lastPath = router.pathname;
    $effect(() => {
        const path = router.pathname;
        if (path !== lastPath) {
            lastPath = path;
            close();
        }
    });

    // The dimmed page behind the panel does not scroll.
    $effect(() => {
        if (!open) return;

        const previous = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.documentElement.style.overflow = previous;
        };
    });

    // The desktop sidebar takes over at `md`; never leave a scroll-locked menu behind.
    $effect(() => {
        const wide = window.matchMedia('(min-width: 768px)');
        const onChange = (event: MediaQueryListEvent) => {
            if (event.matches) close({ restoreFocus: false });
        };
        wide.addEventListener('change', onChange);

        return () => wide.removeEventListener('change', onChange);
    });

    // Capture phase, so an open area switcher handles its own Escape and Tab first.
    function onKeydown(event: KeyboardEvent) {
        if (!open || switcherOpen) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            close();

            return;
        }

        // Keep Tab within the capsules, the panel and the bar; the page behind is dimmed.
        if (event.key === 'Tab' && root) {
            const focusable = [
                ...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'),
            ].filter(el => el.tabIndex >= 0 && el.getClientRects().length > 0);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }
</script>

<svelte:window onkeydowncapture={onKeydown} />

{#snippet capsuleChevron()}
    <span class="grid px-1.5 text-(color:--mn-muted)">
        <ChevronsUpDown class="size-4" strokeWidth={1.5} aria-hidden="true" />
    </span>
{/snippet}

<SearchModal bind:open={searchOpen} />

<div bind:this={root} class="mn-theme md:hidden">
    {#if shown}
        <!-- Tapping the dimmed page closes the menu; the keyboard equivalent is Escape. -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div
            bind:this={backdrop}
            class="fixed inset-0 z-40 bg-(color:--mn-backdrop)"
            aria-hidden="true"
            onclick={() => close()}
        ></div>

        <div
            bind:this={panel}
            class="fixed inset-x-2 bottom-[calc(38px+env(safe-area-inset-bottom))] z-40 flex flex-col"
        >
            <div class="flex min-w-0 gap-2 py-2">
                <div
                    class="flex h-[38px] flex-none items-center rounded-full border border-(color:--mn-capsule-border)
                           bg-(color:--mn-capsule-bg) text-sm font-medium text-(color:--mn-fg)"
                >
                    <Link
                        href={area === 'admin' ? '/admin' : '/'}
                        end={area !== 'admin'}
                        class="flex h-9 items-center gap-2 rounded-full pl-2.5 {app.isAdmin ? '' : 'pr-3.5'} {focusRing}"
                    >
                        <Avatar src={app.user?.avatarUrl} name={app.user?.uuid ?? 'system'} size={18} class="flex-none" />
                        <span class="truncate">{area === 'admin' ? '管理后台' : '控制台'}</span>
                    </Link>

                    {#if app.isAdmin}
                        <span class="ml-2.5 h-4 w-px flex-none bg-(color:--mn-capsule-border)" aria-hidden="true"></span>
                        <DropdownMenu.Root bind:open={switcherOpen}>
                            <DropdownMenu.Trigger
                                class="flex h-8 items-center rounded-full pr-0.5 {focusRing}"
                                aria-label="切换区域"
                            >
                                {@render capsuleChevron()}
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    align="start"
                                    sideOffset={8}
                                    class="mn-theme z-50 w-44 rounded-[12px] bg-(color:--mn-panel) p-2 text-sm text-(color:--mn-fg)
                                           shadow-[0_0_0_1px_var(--mn-capsule-border)] outline-none"
                                >
                                    {#each areaOptions as option (option.value)}
                                        <DropdownMenu.Item
                                            onSelect={() => switchArea(option.value)}
                                            class="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-[6px] px-2 outline-none
                                                   data-highlighted:bg-(color:--mn-active-bg)"
                                        >
                                            <span>{option.label}</span>
                                            {#if (option.value === 'admin') === (area === 'admin')}
                                                <Check class="size-4" strokeWidth={1.5} aria-label="当前" />
                                            {/if}
                                        </DropdownMenu.Item>
                                    {/each}
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    {/if}
                </div>

                {#if scope}
                    <button
                        type="button"
                        class="flex h-[38px] min-w-0 items-center rounded-full border border-(color:--mn-capsule-border)
                               bg-(color:--mn-capsule-bg) pr-0.5 pl-3 text-sm font-medium text-(color:--mn-fg) {focusRing}"
                        aria-label="切换服务器：{scope}"
                        onclick={openSearch}
                    >
                        <span class="truncate">{scope}</span>
                        {@render capsuleChevron()}
                    </button>
                {/if}
            </div>

            <nav
                id={panelId}
                aria-label={navLabel}
                class="max-h-[min(628px,calc(100svh_-_108px))] overflow-y-auto overscroll-contain rounded-[12px]
                       bg-(color:--mn-panel) pt-2 pb-10 text-(color:--mn-fg) scrollbar-thin"
            >
                <div class="flex flex-col gap-px px-2">
                    {@render primary()}
                </div>

                <hr class="my-2 h-px border-0 bg-(color:--mn-divider)" />

                <div class="flex items-center gap-2 px-4 py-2.5">
                    <Avatar src={app.user?.avatarUrl} name={app.user?.uuid ?? 'system'} size={20} class="flex-none" />
                    <div class="min-w-0">
                        <p class="truncate text-sm leading-5 font-medium">{app.user?.username}</p>
                        <p class="truncate text-[13px] leading-[18px] text-(color:--mn-muted)">{app.user?.email}</p>
                    </div>
                </div>

                <hr class="my-2 h-px border-0 bg-(color:--mn-divider)" />

                <div class="flex flex-col px-2">
                    {#if area !== 'dashboard'}
                        <MobileNavAction label="返回控制台" icon={House} href="/" />
                        <MobileNavAction label="账号设置" icon={Settings} href="/account" />
                    {/if}

                    {@render actions?.()}

                    <div class="-mr-1 flex h-9 items-center justify-between px-2 text-sm">
                        <span id="{panelId}-theme">主题</span>
                        <fieldset
                            class="m-0 flex h-6 rounded-full border-0 p-0 shadow-[0_0_0_1px_var(--mn-seg-ring)]"
                            aria-labelledby="{panelId}-theme"
                        >
                            {#each themeOptions as option (option.value)}
                                {@const Icon = option.icon}
                                <label
                                    class="relative grid size-6 cursor-pointer place-content-center rounded-full text-(color:--mn-seg-muted)
                                           has-checked:bg-(color:--mn-seg-active-bg) has-checked:text-(color:--mn-fg)
                                           has-checked:shadow-(--mn-seg-active-shadow) has-focus-visible:outline-2
                                           has-focus-visible:outline-(color:--mn-focus)"
                                >
                                    <input
                                        type="radio"
                                        name="{panelId}-theme"
                                        value={option.value}
                                        checked={theme.preference === option.value}
                                        onchange={() => theme.set(option.value)}
                                        class="sr-only"
                                    />
                                    <Icon class="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                                    <span class="sr-only">{option.label}</span>
                                </label>
                            {/each}
                        </fieldset>
                    </div>

                    {#each links as link (link.id)}
                        <MobileNavAction label={link.name} icon={ArrowUpRight} href={link.url} external />
                    {/each}

                    <MobileNavAction label="退出登录" icon={LogOut} onclick={() => logout()} />
                </div>
            </nav>
        </div>
    {/if}

    <div
        class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex h-11 -translate-x-1/2 items-center
               rounded-[12px] bg-(color:--mn-bar) px-1.5 text-sm text-(color:--mn-fg) backdrop-blur-xl"
    >
        <button
            type="button"
            class="flex h-11 w-[91px] items-center gap-1 text-(color:--mn-muted) transition-colors hover:text-(color:--mn-fg) {focusRing}"
            aria-label="搜索服务器"
            onclick={openSearch}
        >
            <span class="grid size-8 place-content-center">
                <Search class="size-4" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <span>搜索</span>
        </button>

        <span class="h-6 w-px bg-(color:--mn-bar-sep)" aria-hidden="true"></span>

        <button
            bind:this={toggle}
            type="button"
            class="flex h-8 items-center pl-1.5 {focusRing}"
            aria-label={open ? '关闭菜单' : '打开菜单'}
            aria-expanded={open}
            aria-controls={panelId}
            onclick={() => (open ? close() : (open = true))}
        >
            <span class="grid size-8 place-content-center">
                <!-- Geist's menu and close glyphs; the icon swaps instantly, as on Vercel. -->
                <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
                    {#if open}
                        <path
                            fill-rule="evenodd"
                            d="m12.47 13.53.53.53L14.06 13l-.53-.53L9.06 8l4.47-4.47.53-.53L13 1.94l-.53.53L8 6.94 3.53 2.47 3 1.94 1.94 3l.53.53L6.94 8l-4.47 4.47-.53.53L3 14.06l.53-.53L8 9.06z"
                            clip-rule="evenodd"
                        />
                    {:else}
                        <path fill-rule="evenodd" d="M1.75 4H1v1.5h14V4H1.75m0 6.5H1V12h14v-1.5H1.75" clip-rule="evenodd" />
                    {/if}
                </svg>
            </span>
        </button>
    </div>
</div>

<style>
    /*
     * Colours measured on vercel.com (Geist tokens), light first then dark. Global so
     * the portaled area switcher, which carries the same class, resolves them too.
     */
    :global(.mn-theme) {
        --mn-bar: rgba(255, 255, 255, 0.8);
        --mn-bar-sep: rgba(0, 0, 0, 0.1);
        --mn-backdrop: rgba(255, 255, 255, 0.8);
        --mn-panel: #fff;
        --mn-fg: #171717;
        --mn-muted: #4d4d4d;
        --mn-active-bg: #ebebeb;
        --mn-hover: #f2f2f2;
        --mn-divider: #ebebeb;
        --mn-capsule-bg: #fff;
        --mn-capsule-border: #ebebeb;
        --mn-seg-ring: rgba(0, 0, 0, 0.08);
        --mn-seg-muted: #8f8f8f;
        --mn-seg-active-bg: #fff;
        --mn-seg-active-shadow: 0 0 0 1px #ebebeb, 0 1px 2px rgba(0, 0, 0, 0.04);
        --mn-focus: hsl(212 100% 48%);
    }

    :global(.dark .mn-theme) {
        --mn-bar: rgba(26, 26, 26, 0.8);
        --mn-bar-sep: rgba(255, 255, 255, 0.13);
        --mn-backdrop: rgba(10, 10, 10, 0.8);
        --mn-panel: #1a1a1a;
        --mn-fg: #ededed;
        --mn-muted: #a1a1a1;
        --mn-active-bg: #1f1f1f;
        --mn-hover: #1f1f1f;
        --mn-divider: #1f1f1f;
        --mn-capsule-bg: #0a0a0a;
        --mn-capsule-border: #2e2e2e;
        --mn-seg-ring: rgba(255, 255, 255, 0.145);
        --mn-seg-muted: #8f8f8f;
        --mn-seg-active-bg: #0a0a0a;
        --mn-seg-active-shadow: 0 0 0 1px #2e2e2e, 0 1px 2px rgba(255, 255, 255, 0.06);
    }
</style>
