<script lang="ts">
    import { Plus, X } from '@lucide/svelte';
    import type { Egg, EggValues } from '$lib/api/admin/nests';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Textarea from '$lib/ui/Textarea.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import CodeField from './CodeField.svelte';

    /**
     * Egg settings, shared by the new egg page and the egg's settings tab. Ported from
     * EggSettingsContainer.tsx and NewEggContainer.tsx. Differences: images are edited as
     * label/image rows (the legacy create form used each image as its own label and the
     * settings form parsed `image|label` lines); the JSON fields are checked before sending.
     */
    type Props = {
        egg: Egg | null;
        disabled?: boolean;
        submitLabel: string;
        onSubmit: (values: EggValues) => Promise<void>;
        /** Extra buttons on the left of the save bar. */
        actions?: import('svelte').Snippet;
    };
    let { egg, disabled = false, submitLabel, onSubmit, actions }: Props = $props();

    let name = $state(egg?.name ?? '');
    let description = $state(egg?.description ?? '');
    let startup = $state(egg?.startup ?? '');
    let stop = $state(egg?.config.stop ?? '');
    let images = $state(
        egg && Object.keys(egg.dockerImages).length
            ? Object.entries(egg.dockerImages).map(([label, image]) => ({ label: label === image ? '' : label, image }))
            : [{ label: '', image: '' }],
    );
    let getStartupConfig = () => egg?.config.startup ?? '{}';
    let getFilesConfig = () => egg?.config.files ?? '{}';

    const filled = $derived(images.filter(i => i.image.trim()));
    const labels = $derived(filled.map(i => i.label.trim() || i.image.trim()));
    const errors = $derived({
        name: !name.trim() || name.trim().length > 191 ? '名称需要 1–191 个字符。' : undefined,
        startup: startup.trim() ? undefined : '请填写启动命令。',
        images: !filled.length ? '至少需要一个镜像。' : new Set(labels).size !== labels.length ? '镜像名称不能重复。' : undefined,
        // StoreEggRequest rejects an empty stop command; one inherited through config_from may be empty.
        stop: stop.trim().length > 191 ? '不能超过 191 个字符。' : !stop.trim() && !egg?.config.extends ? '请填写停止命令。' : undefined,
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    let saving = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    function json(label: string, text: string): string {
        try {
            JSON.parse(text);
            return text;
        } catch (e) {
            throw new Error(`${label}不是有效的 JSON：${(e as Error).message}`);
        }
    }

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        notice = null;
        try {
            const configStartup = json('启动配置', getStartupConfig().trim() || '{}');
            const configFiles = json('配置文件', getFilesConfig().trim() || '{}');
            await onSubmit({
                name: name.trim(),
                description: description.trim() || null,
                docker_images: Object.fromEntries(filled.map((i, n) => [labels[n], i.image.trim()])),
                startup: startup.trim(),
                config_files: configFiles,
                config_startup: configStartup,
                config_stop: stop.trim() || null,
            });
            if (egg) notice = { variant: 'success', text: 'Egg 设置已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: e instanceof Error && !('isAxiosError' in e) ? e.message : httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    const off = $derived(disabled || saving);
</script>

<form onsubmit={save} class="space-y-4">
    {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}

    <div class="grid gap-4 lg:grid-cols-2">
        <Card>
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent class="space-y-4 text-sm">
                <div class="space-y-1.5">
                    <Label for="egg-name">名称</Label>
                    <Input id="egg-name" bind:value={name} disabled={off} error={errors.name} />
                </div>
                <div class="space-y-1.5">
                    <Label for="egg-description">描述</Label>
                    <Textarea id="egg-description" bind:value={description} rows={4} disabled={off} />
                </div>
                {#if egg}
                    <div class="grid gap-3 sm:grid-cols-2">
                        <div class="min-w-0"><p class="text-xs text-muted-foreground">UUID</p><p class="truncate font-mono text-xs">{egg.uuid}</p></div>
                        <div class="min-w-0"><p class="text-xs text-muted-foreground">作者</p><p class="truncate">{egg.author}</p></div>
                    </div>
                {/if}
            </CardContent>
        </Card>

        <Card>
            <CardHeader><CardTitle>Docker 镜像</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                <p class="text-xs text-muted-foreground">用户可以在这些镜像之间切换。名称留空时直接显示镜像地址。</p>
                {#each images as img, i (i)}
                    <div class="flex gap-2">
                        <Input bind:value={img.label} placeholder="名称，如 Java 21" aria-label="镜像 {i + 1} 名称" class="w-40 shrink-0" disabled={off} />
                        <Input bind:value={img.image} placeholder="ghcr.io/pterodactyl/yolks:java_21" aria-label="镜像 {i + 1} 地址" class="font-mono text-xs" disabled={off} />
                        <Button type="button" variant="ghost" size="icon" aria-label="移除镜像 {i + 1}" disabled={off || images.length === 1} onclick={() => (images = images.filter((_, n) => n !== i))}><X /></Button>
                    </div>
                {/each}
                {#if errors.images}<p class="text-xs text-destructive">{errors.images}</p>{/if}
                <Button type="button" variant="outline" size="sm" disabled={off} onclick={() => (images = [...images, { label: '', image: '' }])}><Plus />添加镜像</Button>
            </CardContent>
        </Card>
    </div>

    <Card>
        <CardHeader><CardTitle>启动与停止</CardTitle></CardHeader>
        <CardContent class="space-y-4 text-sm">
            <div class="space-y-1.5">
                <Label for="egg-startup">启动命令</Label>
                <Input id="egg-startup" bind:value={startup} class="font-mono text-xs" disabled={off} error={errors.startup} />
                <p class="text-xs text-muted-foreground">新服务器的默认启动命令。可以用 {'{{SERVER_MEMORY}}'}、{'{{SERVER_PORT}}'} 和变量的环境变量名。</p>
            </div>
            <div class="space-y-1.5">
                <Label for="egg-stop">停止命令</Label>
                <Input id="egg-stop" bind:value={stop} class="font-mono text-xs" placeholder="stop" disabled={off} error={errors.stop} />
                <p class="text-xs text-muted-foreground">发送到控制台的命令；填 ^C 表示发送 SIGINT。</p>
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle>进程配置</CardTitle></CardHeader>
        <CardContent class="space-y-4 text-sm">
            {#if egg?.config.extends}
                <Alert>这个 Egg 继承 <Link href="/admin/nests/{egg.nestId}/eggs/{egg.config.extends}" class="underline">Egg #{egg.config.extends}</Link> 的进程配置，这里留空的项会使用它的值。</Alert>
            {/if}
            <div class="space-y-1.5">
                <span class="text-sm font-medium">启动配置</span>
                <p class="text-xs text-muted-foreground">Wings 用它判断服务器何时启动完成，例如 {'{"done": ")! For help, type "}'}。</p>
                <CodeField content={egg?.config.startup ?? '{}'} filename="startup.json" registerContent={get => (getStartupConfig = get)} class="h-40" />
            </div>
            <div class="space-y-1.5">
                <span class="text-sm font-medium">配置文件</span>
                <p class="text-xs text-muted-foreground">启动前由 Wings 改写的文件，例如把端口写进 server.properties。</p>
                <CodeField content={egg?.config.files ?? '{}'} filename="files.json" registerContent={get => (getFilesConfig = get)} class="h-64" />
            </div>
        </CardContent>
    </Card>

    <div class="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        {@render actions?.()}
        <Button type="submit" class="ml-auto" loading={saving} disabled={disabled || !valid}>{submitLabel}</Button>
    </div>
</form>
