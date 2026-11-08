<script lang="ts">
    import type { Snippet } from 'svelte';
    import { app } from '$lib/stores/app.svelte';
    import { Card } from '$lib/ui';
    import ThemeToggle from '$lib/components/ThemeToggle.svelte';

    /** The centred card every auth page sits in, ported from LoginFormContainer.tsx. */
    let { title, description, children }: { title: string; description?: string; children: Snippet } = $props();
    const name = $derived(app.settings?.name || 'Jexactyl');
</script>

<svelte:head>
    <title>{title} | {name}</title>
</svelte:head>

<div class="relative flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
    <div class="absolute top-4 right-4"><ThemeToggle /></div>
    <div class="w-full max-w-sm">
        <div class="mb-6 text-center">
            {#if app.settings?.logo}<img src={app.settings.logo} alt="" class="mx-auto mb-3 size-12 rounded-lg object-contain" />{/if}
            <h1 class="font-header text-2xl font-semibold">{title}</h1>
            {#if description}<p class="mt-1 text-sm text-muted-foreground">{description}</p>{/if}
        </div>
        <Card class="p-6">{@render children()}</Card>
        <p class="mt-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {name}</p>
    </div>
</div>
