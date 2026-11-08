<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
    import { cn } from '$lib/utils/cn';
    import { navigate } from '$lib/router/router.svelte';
    import { buttonVariants, type ButtonSize, type ButtonVariant } from './variants';
    import Spinner from '$lib/ui/Spinner.svelte';

    type Props = {
        variant?: ButtonVariant;
        size?: ButtonSize;
        /** Renders an anchor and routes client-side for internal paths. */
        href?: string;
        loading?: boolean;
        class?: string;
        children?: Snippet;
    } & Omit<HTMLButtonAttributes & HTMLAnchorAttributes, 'class' | 'href'>;

    let {
        variant = 'default',
        size = 'default',
        href,
        loading = false,
        class: className,
        children,
        ...rest
    }: Props = $props();

    const classes = $derived(cn(buttonVariants({ variant, size }), className));

    // An external URL or one opening in a new tab must go through the browser rather
    // than the client router.
    const isInternal = $derived(Boolean(href?.startsWith('/') && !rest.target));

    function onClick(event: MouseEvent) {
        if (!href || !isInternal) return;
        // Leave modified clicks (new tab, new window) to the browser.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

        event.preventDefault();
        navigate(href);
    }
</script>

{#if href}
    <a {href} class={classes} aria-busy={loading} onclick={onClick} {...rest}>
        {#if loading}
            <Spinner size="sm" />
        {/if}
        {@render children?.()}
    </a>
{:else}
    <button
        class={classes}
        aria-busy={loading}
        disabled={loading || (rest as HTMLButtonAttributes).disabled}
        {...rest}
    >
        {#if loading}
            <Spinner size="sm" />
        {/if}
        {@render children?.()}
    </button>
{/if}
