<script lang="ts">
    import type { Schedule } from '$lib/api/definitions/server';

    interface Props {
        cron: Schedule['cron'];
        detailed?: boolean;
        class?: string;
    }

    let { cron, detailed = false, class: className = '' }: Props = $props();

    /** Cron fields of a schedule, ported from ScheduleCronRow.tsx. */
    const cronFields = $derived([
        { label: '分钟', value: cron.minute },
        { label: '小时', value: cron.hour },
        { label: '日期', value: cron.dayOfMonth },
        { label: '月份', value: cron.month },
        { label: '周几', value: cron.dayOfWeek },
    ]);
</script>

{#if detailed}
    <div class="grid grid-cols-5 gap-4">
        {#each cronFields as field (field.label)}
            <div class="rounded-lg border border-border bg-card p-4 text-center">
                <p class="text-xs uppercase text-muted-foreground">{field.label}</p>
                <p class="mt-2 font-mono text-lg font-semibold">{field.value}</p>
            </div>
        {/each}
    </div>
{:else}
    <div
        class="inline-flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground {className}"
    >
        {#each cronFields as field, idx (field.label)}
            {#if idx > 0}
                <span class="text-border">·</span>
            {/if}
            <span>{field.label}: <span class="font-mono text-foreground">{field.value}</span></span>
        {/each}
    </div>
{/if}
