<script lang="ts">
    import { Bell, Scale } from '@lucide/svelte';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import type { LimitInputs } from './limits';

    /** Ported from settings/ServerResourceBox.tsx and FeatureLimitsBox.tsx. */
    type Props = { values: LimitInputs; errors: Partial<Record<keyof LimitInputs, string>>; disabled?: boolean };
    let { values = $bindable(), errors, disabled = false }: Props = $props();

    const resource: { key: keyof LimitInputs; label: string; hint: string }[] = [
        { key: 'cpu', label: 'CPU 上限（%）', hint: '100% 相当于一个线程，0 表示不限制。' },
        { key: 'threads', label: 'CPU 绑定', hint: '高级：限定可用的核心，如 0、0-1,3。留空表示不限。' },
        { key: 'memory', label: '内存（MiB）', hint: '0 表示不限制。' },
        { key: 'swap', label: 'Swap（MiB）', hint: '0 关闭，-1 不限制。' },
        { key: 'disk', label: '磁盘（MiB）', hint: '超出后服务器会被停止并锁定，0 表示不限制。' },
        { key: 'io', label: 'Block IO 权重', hint: '高级：相对其他容器的 IO 优先级，10–1000。' },
    ];
    const feature: { key: keyof LimitInputs; label: string; hint: string }[] = [
        { key: 'allocations', label: '端口分配数', hint: '用户可以自行添加的分配数量。' },
        { key: 'backups', label: '备份数', hint: '可以创建的备份数量。' },
        { key: 'databases', label: '数据库数', hint: '可以创建的数据库数量。' },
        { key: 'subusers', label: '子用户数', hint: '可以添加的子用户数量。' },
    ];
</script>

{#snippet field(f: { key: keyof LimitInputs; label: string; hint: string })}
    <div class="space-y-1.5">
        <Label for="limit-{f.key}">{f.label}</Label>
        <Input
            id="limit-{f.key}"
            value={String(values[f.key])}
            oninput={e => ((values[f.key] as string) = e.currentTarget.value)}
            inputmode={f.key === 'threads' ? 'text' : 'numeric'}
            class="font-mono"
            {disabled}
            error={errors[f.key]}
        />
        <p class="text-xs text-muted-foreground">{f.hint}</p>
    </div>
{/snippet}

<Card>
    <CardHeader><CardTitle class="flex items-center gap-2"><Scale class="size-4" />资源</CardTitle></CardHeader>
    <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
        {#each resource as f (f.key)}{@render field(f)}{/each}
        <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3 sm:col-span-2">
            <span>
                <span class="font-medium">OOM Killer</span>
                <span class="block text-xs text-muted-foreground">内存耗尽时由内核结束进程。开启可能导致服务器进程意外退出。</span>
            </span>
            <Switch bind:checked={values.oomKiller} aria-label="OOM Killer" {disabled} />
        </label>
    </CardContent>
</Card>

<Card>
    <CardHeader><CardTitle class="flex items-center gap-2"><Bell class="size-4" />功能限制</CardTitle></CardHeader>
    <CardContent class="grid gap-4 text-sm sm:grid-cols-2">
        {#each feature as f (f.key)}{@render field(f)}{/each}
    </CardContent>
</Card>
