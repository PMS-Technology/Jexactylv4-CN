<script lang="ts">
    import type { Component, Snippet } from 'svelte';
    import { cn } from '$lib/utils/cn';

    /** Centered status card shared by the post-checkout pages. */
    type Props = {
        icon: Component<any>;
        tone: 'success' | 'muted' | 'destructive';
        title: string;
        children?: Snippet;
        actions?: Snippet;
    };

    let { icon: Icon, tone, title, children, actions }: Props = $props();

    const tones = {
        success: 'bg-success/15 text-success',
        muted: 'bg-muted text-muted-foreground',
        destructive: 'bg-destructive/15 text-destructive',
    } as const;
</script>

<div class="flex min-h-[60vh] items-center justify-center p-6">
    <div class="w-full max-w-md text-center">
        <div class={cn('mx-auto flex size-12 items-center justify-center rounded-full', tones[tone])}>
            <Icon class="size-6" />
        </div>
        <h1 class="mt-4 font-header text-lg font-semibold">{title}</h1>
        {#if children}
            <div class="mt-2 text-sm text-muted-foreground">{@render children()}</div>
        {/if}
        {#if actions}
            <div class="mt-6 flex justify-center gap-2">{@render actions()}</div>
        {/if}
    </div>
</div>
