<script lang="ts">
    import type { Snippet } from 'svelte';

    /** Progress ring, ported from `elements/billing/RadialProgress.tsx`. */
    let { value, size = 96, children }: { value: number; size?: number; children?: Snippet } = $props();

    const stroke = 8;
    const radius = $derived((size - stroke) / 2);
    const circumference = $derived(2 * Math.PI * radius);
    const clamped = $derived(Math.min(100, Math.max(0, value)));
</script>

<div class="relative shrink-0" style:width="{size}px" style:height="{size}px">
    <svg width={size} height={size} class="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke-width={stroke} class="stroke-muted" />
        <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke-width={stroke}
            stroke-linecap="round"
            class="stroke-primary transition-[stroke-dashoffset] duration-500"
            stroke-dasharray={circumference}
            stroke-dashoffset={circumference * (1 - clamped / 100)}
        />
    </svg>
    <div class="absolute inset-0 flex items-center justify-center">{@render children?.()}</div>
</div>
