<script lang="ts">
    import { CircleAlert, CircleHelp, CircleX, LoaderCircle } from '@lucide/svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import Link from '$lib/components/Link.svelte';

    let { store }: { store: ServerStore } = $props();

    /**
     * Full-page replacement while the server is unusable, ported from
     * ConflictStateRenderer.tsx. Which screen applies depends on the server's status
     * object (install/suspend states), not the live power state.
     */
    const screen = $derived.by(() => {
        const { status, isNodeUnderMaintenance, isTransferring } = store.server ?? {};

        if (status === 'installing' || status === 'install_failed' || status === 'reinstall_failed') {
            return {
                icon: LoaderCircle,
                title: '正在安装',
                message: '服务器应该很快准备就绪，请几分钟后再来查看。',
                spin: true,
            };
        }

        if (status === 'suspended') {
            return {
                icon: CircleX,
                title: '服务器已被停用',
                message: '此服务器已被停用，无法访问。',
                spin: false,
            };
        }

        if (isNodeUnderMaintenance) {
            return {
                icon: CircleAlert,
                title: '节点维护中',
                message: '此服务器所在节点正在维护。',
                spin: false,
            };
        }

        return {
            icon: CircleHelp,
            title: isTransferring ? '迁移中' : '正在恢复备份',
            message: isTransferring
                ? '你的服务器正在迁移到新节点，请稍后再来查看。'
                : '你的服务器正在从备份恢复，请几分钟后再来查看。',
            spin: false,
        };
    });
</script>

<div class="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
    <div class="flex size-14 items-center justify-center rounded-full bg-muted">
        <screen.icon class="size-7 text-muted-foreground {screen.spin ? 'animate-spin' : ''}" />
    </div>
    <div class="space-y-1">
        <h1 class="font-header text-lg font-semibold">{screen.title}</h1>
        <p class="max-w-md text-sm text-muted-foreground">{screen.message}</p>
    </div>
    <Link href="/" class="text-sm underline-offset-4 hover:underline">返回控制台</Link>
</div>
