<script lang="ts">
    // Ported from `resources/scripts/components/server/schedules/ScheduleCheatsheetCards.tsx`
</script>

<div class="grid gap-6 md:grid-cols-2">
    <!-- Examples -->
    <div class="space-y-2">
        <h3 class="font-semibold text-sm">示例</h3>
        <div class="space-y-1 text-sm">
            {#each [
                { cron: '*/5 * * * *', desc: '每 5 分钟' },
                { cron: '0 */1 * * *', desc: '每小时' },
                { cron: '0 8-12 * * *', desc: '小时范围' },
                { cron: '0 0 * * *', desc: '每天一次' },
                { cron: '0 0 * * MON', desc: '每周一' },
            ] as example (example.cron)}
                <div class="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
                    <code class="font-mono text-xs">{example.cron}</code>
                    <span class="text-xs text-muted-foreground">{example.desc}</span>
                </div>
            {/each}
        </div>
    </div>

    <!-- Special characters -->
    <div class="space-y-2">
        <h3 class="font-semibold text-sm">特殊字符</h3>
        <div class="space-y-1 text-sm">
            {#each [
                { char: '*', desc: '任何值' },
                { char: ',', desc: '值列表分隔符' },
                { char: '-', desc: '范围值' },
                { char: '/', desc: '步进值' },
            ] as item (item.char)}
                <div class="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
                    <code class="font-mono text-xs">{item.char}</code>
                    <span class="text-xs text-muted-foreground">{item.desc}</span>
                </div>
            {/each}
        </div>
    </div>
</div>
