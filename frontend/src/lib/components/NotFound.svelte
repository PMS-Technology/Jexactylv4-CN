<script lang="ts">
    import { FileQuestion } from '@lucide/svelte';
    import { Button } from '$lib/ui';

    type Props = {
        title?: string;
        message?: string;
        /** Where the action button goes; defaults to the dashboard. */
        backTo?: string;
        backLabel?: string;
    };

    let {
        title = '页面不存在',
        message = '我们找不到你要访问的页面。',
        backTo = '/',
        backLabel = '返回控制台',
    }: Props = $props();
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
    <div class="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileQuestion class="size-6 text-muted-foreground" />
    </div>
    <div class="space-y-1">
        <h1 class="text-lg font-semibold">{title}</h1>
        <p class="text-sm text-muted-foreground">{message}</p>
    </div>
    <Button href={backTo} variant="outline" size="sm">{backLabel}</Button>
</div>
