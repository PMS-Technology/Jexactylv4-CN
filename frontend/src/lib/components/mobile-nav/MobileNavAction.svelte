<script lang="ts" module>
    /**
     * Secondary row in the phone menu (account and utility entries): regular-weight
     * label on the left, muted icon on the right, as in the Vercel dashboard. Exported
     * so an area can build a custom row, such as the server power controls.
     */
    export const mobileNavRowClass =
        'flex h-9 w-full items-center justify-between gap-3 rounded-[6px] px-2 text-left text-sm text-(color:--mn-fg) ' +
        'transition-colors hover:bg-(color:--mn-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(color:--mn-focus)';
</script>

<script lang="ts">
    import type { Component } from 'svelte';
    import Link from '$lib/components/Link.svelte';

    type Props = {
        label: string;
        icon: Component<any>;
        /** Renders a link; without it the row is a button. */
        href?: string;
        /** Full document load, for targets served by another shell. */
        document?: boolean;
        /** Opens in a new tab. */
        external?: boolean;
        onclick?: () => void;
    };

    let { label, icon: Icon, href, document: fullLoad = false, external = false, onclick }: Props = $props();
</script>

{#snippet body()}
    <span class="min-w-0 truncate">{label}</span>
    <Icon class="size-4 flex-none text-(color:--mn-muted)" strokeWidth={1.5} aria-hidden="true" />
    {#if external}<span class="sr-only">（在新标签页打开）</span>{/if}
{/snippet}

{#if href && external}
    <a {href} target="_blank" rel="noreferrer" class={mobileNavRowClass}>{@render body()}</a>
{:else if href && fullLoad}
    <a {href} class={mobileNavRowClass}>{@render body()}</a>
{:else if href}
    <Link {href} class={mobileNavRowClass}>{@render body()}</Link>
{:else}
    <button type="button" class={mobileNavRowClass} {onclick}>{@render body()}</button>
{/if}
