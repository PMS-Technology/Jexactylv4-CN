<script lang="ts">
    import { Archive, Cpu, Database, HardDrive, MemoryStick, Network } from '@lucide/svelte';
    import type { Product } from '$lib/api/definitions/billing';

    let { limits }: { limits: Product['limits'] } = $props();

    const gib = (mib: number) => `${Number((mib / 1024).toFixed(1))} GiB`;

    const rows = $derived([
        { icon: Cpu, label: `${limits.cpu}% CPU` },
        { icon: MemoryStick, label: `${gib(limits.memory)} 内存` },
        { icon: HardDrive, label: `${gib(limits.disk)} 磁盘` },
        { icon: Network, label: `${limits.allocation} 个端口` },
        { icon: Archive, label: `${limits.backup} 个备份` },
        { icon: Database, label: `${limits.database} 个数据库` },
    ]);
</script>

<ul class="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
    {#each rows as row (row.label)}
        {@const Icon = row.icon}
        <li class="flex items-center gap-2">
            <Icon class="size-4 shrink-0" />
            <span>{row.label}</span>
        </li>
    {/each}
</ul>
