<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { HTMLAnchorAttributes } from 'svelte/elements';
    import { navigate, router } from '$lib/router/router.svelte';
    import { cn } from '$lib/utils/cn';

    type Props = {
        href: string;
        /** Applied when this link points at the current page. */
        activeClass?: string;
        /** Only treat as active on an exact path match. */
        end?: boolean;
        class?: string;
        children?: Snippet;
    } & Omit<HTMLAnchorAttributes, 'href' | 'class'>;

    let { href, activeClass, end = false, class: className, children, ...rest }: Props = $props();

    const isExternal = $derived(!href.startsWith('/') || Boolean(rest.target));
    const active = $derived(!isExternal && router.isActive(href, end));

    function onClick(event: MouseEvent) {
        if (isExternal) return;
        // Preserve the browser's behaviour for modified and non-primary clicks.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

        event.preventDefault();
        navigate(href);
    }
</script>

<a
    {href}
    class={cn(className, active && activeClass)}
    aria-current={active ? 'page' : undefined}
    onclick={onClick}
    {...rest}
>
    {@render children?.()}
</a>
