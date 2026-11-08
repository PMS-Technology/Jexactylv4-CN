<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { ArrowLeft } from '@lucide/svelte';
    import { adminNestKeys, createEgg, getNest } from '$lib/api/admin/nests';
    import { navigate } from '$lib/router/router.svelte';
    import { Button } from '$lib/ui';
    import EggForm from './EggForm.svelte';

    /** A new egg in a nest, ported from NewEggContainer.tsx. Variables and the install script are set on the egg's page afterwards. */
    let { nestId }: { nestId: number } = $props();

    const queryClient = useQueryClient();
    const nest = createQuery(() => ({ queryKey: adminNestKeys.nest(nestId), queryFn: () => getNest(nestId) }));
</script>

<div class="mb-6 flex flex-wrap items-center gap-3">
    <div class="min-w-0 flex-1">
        <h1 class="font-header text-xl font-semibold">新建 Egg</h1>
        <p class="text-sm text-muted-foreground">添加到 {nest.data?.name ?? `Nest #${nestId}`}。创建后可以设置变量和安装脚本。</p>
    </div>
    <Button variant="ghost" href="/admin/nests/{nestId}"><ArrowLeft />返回</Button>
</div>

<EggForm
    egg={null}
    submitLabel="创建 Egg"
    onSubmit={async values => {
        const { id } = await createEgg(nestId, values);
        await queryClient.invalidateQueries({ queryKey: adminNestKeys.eggs(nestId) });
        navigate(`/admin/nests/${nestId}/eggs/${id}`);
    }}
/>
