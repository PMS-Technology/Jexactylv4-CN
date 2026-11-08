<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { untrack } from 'svelte';
    import { app } from '$lib/stores/app.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { getServerStartup, setDockerImage, type ServerStartup } from '$lib/api/startup';
    import type { EggVariable } from '$lib/api/definitions/server';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Spinner from '$lib/ui/Spinner.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import VariableBox from './VariableBox.svelte';

    /**
     * Startup settings, ported from StartupContainer.tsx: the rendered startup command,
     * the Docker image picker and one VariableBox per egg variable.
     */
    let { store }: { store: ServerStore } = $props();

    const queryClient = useQueryClient();
    const id = untrack(() => store.server!.id);
    const queryKey = ['server', id, 'startup'];

    // Seeded from the server object like the legacy SWR fallbackData, but always refetched
    // on mount (the legacy component called mutate() in an effect for the same reason).
    const startup = createQuery(() => ({
        queryKey,
        queryFn: () => getServerStartup(id),
        initialData: untrack(() => ({
            invocation: store.server!.invocation,
            variables: store.server!.variables,
            dockerImages: { [store.server!.dockerImage]: store.server!.dockerImage },
        })),
        initialDataUpdatedAt: 0,
        retry: 3,
    }));

    // Keep the shared server object in step with fresh startup data.
    $effect(() => {
        const data = startup.data;
        if (!data) return;
        untrack(() => store.patchServer({ variables: data.variables, invocation: data.invocation }));
    });

    const images = $derived(startup.data?.dockerImages ?? {});
    const isCustomImage = $derived(
        !Object.values(images)
            .map(v => v.toLowerCase())
            .includes((store.server?.dockerImage ?? '').toLowerCase()),
    );

    let imageLoading = $state(false);
    let imageError = $state('');

    async function onImageChange(event: Event & { currentTarget: HTMLSelectElement }) {
        const image = event.currentTarget.value;
        imageLoading = true;
        imageError = '';
        try {
            await setDockerImage(id, image);
            store.patchServer({ dockerImage: image });
        } catch (error) {
            console.error(error);
            imageError = httpErrorToHuman(error);
        } finally {
            imageLoading = false;
        }
    }

    function onVariableUpdate(updated: EggVariable, invocation: string) {
        queryClient.setQueryData<ServerStartup>(queryKey, data =>
            data
                ? {
                      ...data,
                      invocation,
                      variables: data.variables.map(v => (v.envVariable === updated.envVariable ? updated : v)),
                  }
                : data,
        );
    }
</script>

<svelte:head>
    <title>启动参数 | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="启动参数" description="控制服务器的启动变量。" />

    {#if startup.isError && !startup.isFetching}
        <Alert variant="destructive" title="无法加载启动参数" class="mb-6">
            <p>{httpErrorToHuman(startup.error)}</p>
            <Button variant="outline" size="sm" class="mt-3" onclick={() => void startup.refetch()}>重试</Button>
        </Alert>
    {/if}

    {#if imageError}
        <Alert variant="destructive" class="mb-6">{imageError}</Alert>
    {/if}

    {#if startup.data}
        <div class="grid gap-6 md:grid-cols-3">
            <Card class="md:col-span-2">
                <CardHeader>
                    <div class="flex items-center justify-between gap-2">
                        <CardTitle>启动命令</CardTitle>
                        <CopyButton text={startup.data.invocation} />
                    </div>
                </CardHeader>
                <CardContent>
                    <p class="rounded-md bg-muted px-4 py-2 font-mono text-sm break-all">
                        {startup.data.invocation}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Docker 镜像</CardTitle></CardHeader>
                <CardContent>
                    {#if Object.keys(images).length > 1 && !isCustomImage}
                        <div class="relative">
                            <select
                                aria-label="Docker 镜像"
                                disabled={imageLoading || !store.can('startup.docker-image')}
                                value={store.server?.dockerImage}
                                onchange={onImageChange}
                                class="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {#each Object.entries(images) as [label, image] (image)}
                                    <option value={image}>{label}</option>
                                {/each}
                            </select>
                            {#if imageLoading}
                                <div class="absolute inset-y-0 right-8 flex items-center"><Spinner size="sm" /></div>
                            {/if}
                        </div>
                        <p class="mt-2 text-xs text-muted-foreground">
                            高级功能：选择运行此服务器实例时使用的 Docker 镜像。
                        </p>
                    {:else}
                        <input
                            aria-label="Docker 镜像"
                            readonly
                            disabled
                            value={store.server?.dockerImage ?? ''}
                            class="h-9 w-full rounded-md border border-input bg-muted/40 px-3 py-1 font-mono text-sm text-muted-foreground"
                        />
                        {#if isCustomImage}
                            <p class="mt-2 text-xs text-muted-foreground">
                                此服务器的 Docker 镜像由管理员手动设置，无法在此处更改。
                            </p>
                        {/if}
                    {/if}
                </CardContent>
            </Card>
        </div>

        <h2 class="mt-8 mb-3 font-header text-lg font-semibold">变量</h2>
        <div class="grid gap-4 md:grid-cols-2">
            {#each startup.data.variables as variable (variable.envVariable)}
                <VariableBox {variable} {store} onUpdate={onVariableUpdate} />
            {/each}
        </div>
    {:else}
        <Spinner centered />
    {/if}
</div>
