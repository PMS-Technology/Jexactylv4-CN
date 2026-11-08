<script lang="ts">
    import type { Component } from 'svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import features from './index';

    /** Mounts the feature modals the server's egg enables, ported from Features.tsx. */
    let { store, enabled }: { store: ServerStore; enabled: string[] } = $props();

    let loaded = $state<[string, Component<any>][]>([]);

    $effect(() => {
        const wanted = enabled.map(v => v.toLowerCase());
        const keys = Object.keys(features).filter(key => wanted.includes(key.toLowerCase()));
        let cancelled = false;

        Promise.all(keys.map(async key => [key, (await features[key]!()).default] as [string, Component<any>]))
            .then(list => {
                if (!cancelled) loaded = list;
            })
            .catch(error => console.error('Failed to load server feature.', error));

        return () => {
            cancelled = true;
        };
    });
</script>

{#each loaded as [key, Feature] (key)}
    <Feature {store} />
{/each}
