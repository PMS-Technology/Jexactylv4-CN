<script lang="ts">
    import { createQuery } from '@tanstack/svelte-query';
    import { Layers } from '@lucide/svelte';
    import { getEggs, getNests, type EggOption } from '$lib/api/admin/servers';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Card, CardContent, CardHeader, CardTitle, Select } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import { variableErrors } from './limits';

    /**
     * Nest, egg, Docker image, startup command and egg variables, ported from
     * ServerStartupContainer's ServerServiceContainer / ServerImageContainer /
     * ServerVariableContainer plus NestSelector and EggSelect. Differences:
     * - Changing the egg resets the startup command to the new egg's default. The legacy
     *   form cleared it, and StartupModificationService keeps the old command when it
     *   receives none, so the server kept the previous egg's command.
     * - A new server starts with the egg's startup command filled in; the legacy form left
     *   it empty, which created the server with no startup command at all.
     * - The image is picked from the egg's list, with a custom value still possible.
     */
    type Props = {
        nestId: number | null;
        eggId: number | null;
        image: string;
        startup: string;
        environment: Record<string, string>;
        /** The server's own egg and stored variable values, kept until the egg is changed. */
        initial?: { eggId: number; values: Record<string, string> } | null;
        disabled?: boolean;
        egg?: EggOption | null;
    };
    let {
        nestId = $bindable(),
        eggId = $bindable(),
        image = $bindable(),
        startup = $bindable(),
        environment = $bindable(),
        initial = null,
        disabled = false,
        egg = $bindable(null),
    }: Props = $props();

    const nests = createQuery(() => ({ queryKey: ['admin', 'nests', 'options'], queryFn: getNests }));
    const eggs = createQuery(() => ({
        queryKey: ['admin', 'nests', nestId, 'eggs', 'full'],
        queryFn: () => getEggs(nestId!),
        enabled: nestId !== null,
    }));

    $effect(() => {
        if (nestId === null && nests.data?.length) nestId = nests.data[0]!.id;
    });

    // Keep the egg inside the selected nest; default to the first one.
    $effect(() => {
        const list = eggs.data;
        if (!list) return;
        if (!list.some(e => e.id === eggId)) eggId = list[0]?.id ?? null;
    });

    $effect(() => {
        egg = eggs.data?.find(e => e.id === eggId) ?? null;
    });

    // Fill image, startup and variables each time a different egg becomes active.
    let filledFor = $state<number | null>(null);
    $effect(() => {
        const e = egg;
        if (!e || filledFor === e.id) return;
        filledFor = e.id;

        const own = initial && initial.eggId === e.id;
        const env: Record<string, string> = {};
        for (const v of e.variables) env[v.envVariable] = (own ? initial!.values[v.envVariable] : undefined) ?? v.defaultValue;
        environment = env;
        if (!own || !image) image = Object.values(e.dockerImages)[0] ?? '';
        if (!own || !startup) startup = e.startup;
    });

    const images = $derived(Object.entries(egg?.dockerImages ?? {}));
    const imageIsListed = $derived(images.some(([, v]) => v === image));
    let customImage = $state(false);

    const nestOptions = $derived([
        ...(nests.data ? [] : [{ value: '', label: '加载中…' }]),
        ...(nests.data ?? []).map(n => ({ value: String(n.id), label: n.name })),
    ]);

    const eggOptions = $derived([
        ...(eggs.data ? [] : [{ value: '', label: '加载中…' }]),
        ...(eggs.data ?? []).map(e => ({ value: String(e.id), label: e.name })),
    ]);

    const imageOptions = $derived(images.map(([label, value]) => ({ value, label: `${label}（${value}）` })));

    const varErrors = $derived(variableErrors(egg, environment));
</script>

<Card>
    <CardHeader><CardTitle class="flex items-center gap-2"><Layers class="size-4" />服务</CardTitle></CardHeader>
    <CardContent class="space-y-4 text-sm">
        <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Select
                    id="svc-nest"
                    items={nestOptions}
                    disabled={disabled || !nests.data}
                    value={nestId === null ? '' : String(nestId)}
                    onValueChange={v => (nestId = Number(v))}
                    label="Nest"
                />
            </div>
            <div class="space-y-1.5">
                <Select
                    id="svc-egg"
                    items={eggOptions}
                    disabled={disabled || !eggs.data}
                    value={eggId === null ? '' : String(eggId)}
                    onValueChange={v => (eggId = Number(v))}
                    label="Egg"
                />
                {#if eggs.error}<p class="text-xs text-destructive">{httpErrorToHuman(eggs.error)}</p>{/if}
            </div>
        </div>

        <div class="space-y-1.5">
            {#if !customImage && (imageIsListed || !image) && images.length}
                <Select id="svc-image" items={imageOptions} {disabled} bind:value={image} label="Docker 镜像" />
            {:else}
                <Label for="svc-image">Docker 镜像</Label>
                <Input id="svc-image" bind:value={image} class="font-mono" {disabled} error={!image.trim() ? '请填写镜像。' : undefined} />
            {/if}
            <button type="button" class="text-xs text-primary hover:underline disabled:opacity-50" {disabled} onclick={() => (customImage = !customImage || !imageIsListed)}>
                {customImage || (!imageIsListed && image) ? '从 Egg 提供的镜像中选择' : '使用自定义镜像'}
            </button>
        </div>

        <div class="space-y-1.5">
            <Label for="svc-startup">启动命令</Label>
            <Input id="svc-startup" bind:value={startup} class="font-mono text-xs" {disabled} error={!startup.trim() ? '请填写启动命令。' : undefined} />
            <p class="text-xs text-muted-foreground">
                可用变量：<code class="font-mono">{'{{SERVER_MEMORY}}'}</code>、<code class="font-mono">{'{{SERVER_IP}}'}</code>、<code class="font-mono">{'{{SERVER_PORT}}'}</code>，以及下面的 Egg 变量。
            </p>
            {#if egg && startup !== egg.startup}
                <p class="text-xs text-muted-foreground">
                    Egg 默认：<code class="font-mono break-all">{egg.startup}</code>
                    {#if !disabled}<button type="button" class="ml-1 text-primary hover:underline" onclick={() => (startup = egg!.startup)}>恢复默认</button>{/if}
                </p>
            {/if}
        </div>
    </CardContent>
</Card>

{#if egg?.variables.length}
    <Card>
        <CardHeader><CardTitle>Egg 变量</CardTitle></CardHeader>
        <CardContent class="grid gap-4 text-sm md:grid-cols-2">
            {#each egg.variables as v (v.envVariable)}
                {@const err = varErrors[v.envVariable]}
                <div class="space-y-1.5">
                    <Label for="var-{v.envVariable}">{v.name}</Label>
                    <Input
                        id="var-{v.envVariable}"
                        value={environment[v.envVariable] ?? ''}
                        oninput={e => (environment[v.envVariable] = e.currentTarget.value)}
                        placeholder={v.defaultValue}
                        class="font-mono"
                        {disabled}
                        error={err}
                    />
                    <p class="text-xs text-muted-foreground">
                        <code class="font-mono">{v.envVariable}</code> · <span class="font-mono">{v.rules}</span>
                        {#if v.description}<span class="block whitespace-pre-line">{v.description}</span>{/if}
                    </p>
                </div>
            {/each}
        </CardContent>
    </Card>
{/if}
