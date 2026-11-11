<script lang="ts">
    import type { Snippet } from 'svelte';
    import { AlertTriangle, CheckCircle2, Info, XCircle } from '@lucide/svelte';
    import { cn } from '$lib/utils/cn';
    import { animateIn } from '$lib/motion';

    type Props = {
        variant?: 'info' | 'success' | 'warning' | 'destructive';
        title?: string;
        class?: string;
        children?: Snippet;
    };

    let { variant = 'info', title, class: className, children }: Props = $props();

    const styles = {
        info: 'border-border bg-muted/40 text-foreground',
        success: 'border-success/30 bg-success/10 text-foreground',
        warning: 'border-warning/30 bg-warning/10 text-foreground',
        destructive: 'border-destructive/30 bg-destructive/10 text-foreground',
    } as const;

    const icons = {
        info: Info,
        success: CheckCircle2,
        warning: AlertTriangle,
        destructive: XCircle,
    } as const;

    const iconColors = {
        info: 'text-muted-foreground',
        success: 'text-success',
        warning: 'text-warning',
        destructive: 'text-destructive',
    } as const;

    const Icon = $derived(icons[variant]);

    // Messages settle in rather than appearing out of nowhere; most of them are
    // rendered the moment a request fails, so the fade carries the change.
    let root = $state<HTMLElement>();

    $effect(() => {
        if (root) animateIn(root, { duration: 0.22, distance: 4 });
    });
</script>

<div
    bind:this={root}
    class={cn('flex gap-3 rounded-lg border p-4 text-sm', styles[variant], className)}
    role={variant === 'destructive' ? 'alert' : 'status'}
>
    <Icon class={cn('mt-0.5 size-4 shrink-0', iconColors[variant])} />
    <div class="min-w-0 space-y-1">
        {#if title}
            <p class="font-medium">{title}</p>
        {/if}
        {#if children}
            <div class="text-muted-foreground">{@render children()}</div>
        {/if}
    </div>
</div>
