<script lang="ts">
    import type { Component } from 'svelte';
    import Link from '$lib/components/Link.svelte';
    import { router } from '$lib/router/router.svelte';
    import { cn } from '$lib/utils/cn';

    /**
     * A primary row in the phone menu, matching the Vercel dashboard: 36px tall, a 36px
     * icon cell, 14px medium label. The current page gets a filled background and full
     * contrast text; everything else is muted.
     */
    type Props = {
        href: string;
        label: string;
        icon: Component<any>;
        /** Exact match only, for index routes. */
        end?: boolean;
        /** Full document load: the target is served by another shell. */
        document?: boolean;
    };

    let { href, label, icon: Icon, end = false, document: fullLoad = false }: Props = $props();

    const active = $derived(router.isActive(href, end));
    const classes = $derived(
        cn(
            'flex h-9 w-full items-center rounded-[6px] pr-3 text-sm font-medium transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--mn-focus)',
            active
                ? 'bg-(color:--mn-active-bg) text-(color:--mn-fg)'
                : 'text-(color:--mn-muted) hover:bg-(color:--mn-hover) hover:text-(color:--mn-fg)',
        ),
    );
</script>

{#snippet body()}
    <span class="grid size-9 flex-none place-content-center">
        <Icon class="size-4" strokeWidth={1.5} aria-hidden="true" />
    </span>
    <span class="min-w-0 flex-1 truncate">{label}</span>
{/snippet}

{#if fullLoad}
    <a {href} class={classes} aria-current={active ? 'page' : undefined}>{@render body()}</a>
{:else}
    <Link {href} {end} class={classes}>{@render body()}</Link>
{/if}
