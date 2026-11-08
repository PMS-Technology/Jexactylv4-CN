<script lang="ts">
    import { onMount } from 'svelte';
    import type { Component } from 'svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import { navigate } from './router.svelte';
    import type { LazyComponent } from './types';

    type Props = {
        /** Lazy loader for the page; resolved when the route becomes active. */
        load: LazyComponent;
        /** Passed through to the page component, e.g. route params. */
        props?: Record<string, unknown>;
        /** When set, navigate here instead of rendering. */
        redirectTo?: string;
        /** Use a document load rather than client routing for the redirect. */
        redirectExternal?: boolean;
    };

    let { load, props = {}, redirectTo, redirectExternal = false }: Props = $props();

    let component = $state<Component<any> | null>(null);
    let failed = $state(false);

    // Re-resolve whenever the loader changes, i.e. when the active route changes.
    $effect(() => {
        if (redirectTo) return;

        const loader = load;
        let cancelled = false;

        component = null;
        failed = false;

        loader()
            .then(mod => {
                if (!cancelled) component = mod.default;
            })
            .catch(error => {
                if (cancelled) return;
                console.error('Failed to load route component.', error);
                failed = true;
            });

        return () => {
            cancelled = true;
        };
    });

    onMount(() => {
        if (!redirectTo) return;

        if (redirectExternal) {
            // Target is served by the other bundle, so the document has to reload.
            window.location.replace(redirectTo);
        } else {
            navigate(redirectTo, { replace: true });
        }
    });
</script>

{#if redirectTo}
    <!-- Navigation happens on mount; nothing to render. -->
{:else if failed}
    <div class="flex flex-col items-center gap-3 py-16 text-center">
        <p class="text-sm text-muted-foreground">This page failed to load.</p>
        <button
            class="text-sm underline underline-offset-4"
            onclick={() => window.location.reload()}
        >
            Reload
        </button>
    </div>
{:else if component}
    {@const Page = component}
    <Page {...props} />
{:else}
    <Spinner centered />
{/if}
