<script lang="ts">
    import { formatDistanceToNowStrict } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ClipboardList, FolderOpen, SquareTerminal } from '@lucide/svelte';
    import type { ActivityLog } from '$lib/api/definitions/account';
    import { describeActivity } from '$lib/utils/activity';
    import { formatDateTime } from '$lib/utils/format';
    import { Button } from '$lib/ui';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Tooltip from '$lib/ui/tooltip/Tooltip.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';

    /** One activity row, ported from `elements/activity/ActivityLogEntry.tsx`. */
    let { activity, eventHref }: { activity: ActivityLog; eventHref: string } = $props();

    const parts = $derived(describeActivity(activity.event, activity.properties));

    let metaOpen = $state(false);
</script>

<li class="group flex gap-4 px-4 py-4 transition-colors hover:bg-accent/40">
    <div class="hidden shrink-0 sm:block">
        <Avatar src={activity.actor?.image} name={activity.actor?.uuid ?? 'system'} size={40} />
    </div>

    <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 text-sm">
            <span class="font-semibold" title={activity.actor?.email ?? '系统用户'}>
                {activity.actor?.username ?? '系统'}
            </span>
            <span class="text-muted-foreground">&bull;</span>
            <Link
                href={eventHref}
                class="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                title="只看此类事件"
            >
                {activity.event}
            </Link>
            {#if activity.isApi}
                <Tooltip content="通过 API 密钥">
                    {#snippet child({ props })}
                        <span {...props} class="text-muted-foreground"><SquareTerminal class="size-4" /></span>
                    {/snippet}
                </Tooltip>
            {/if}
            {#if activity.event.startsWith('server:sftp.')}
                <Tooltip content="通过 SFTP">
                    {#snippet child({ props })}
                        <span {...props} class="text-muted-foreground"><FolderOpen class="size-4" /></span>
                    {/snippet}
                </Tooltip>
            {/if}
        </div>

        <p class="mt-1 line-clamp-2 text-sm break-words text-muted-foreground">
            {#if parts}
                {#each parts as part, i (i)}
                    {#if part.strong}<strong class="font-semibold break-all text-foreground">{part.text}</strong>{:else}{part.text}{/if}
                {/each}
            {:else}
                {activity.description ?? activity.event}
            {/if}
        </p>

        <p class="mt-1 text-xs text-muted-foreground">
            {#if activity.ip}
                <span class="font-mono">{activity.ip}</span>
                <span class="mx-1">|</span>
            {/if}
            <span title={formatDateTime(activity.timestamp)}>
                {formatDistanceToNowStrict(activity.timestamp, { addSuffix: true, locale: zhCN })}
            </span>
        </p>
    </div>

    {#if activity.hasAdditionalMetadata}
        <button
            type="button"
            class="self-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="查看附加元数据"
            onclick={() => (metaOpen = true)}
        >
            <ClipboardList class="size-5" />
        </button>
    {/if}
</li>

{#if activity.hasAdditionalMetadata}
    <Dialog bind:open={metaOpen} title="元数据" class="max-w-lg">
        <pre class="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{JSON.stringify(activity.properties, null, 2)}</pre>

        {#snippet footer()}
            <Button variant="ghost" size="sm" onclick={() => (metaOpen = false)}>关闭</Button>
        {/snippet}
    </Dialog>
{/if}
