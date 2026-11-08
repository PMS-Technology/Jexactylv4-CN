<script lang="ts">
    import { languages } from '@codemirror/language-data';
    import type { LanguageDescription } from '@codemirror/language';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { httpErrorToHuman } from '$lib/api/http';
    import { getFileContents, saveFileContents } from '$lib/api/files';
    import { encodePathSegments } from '$lib/utils/files';
    import { Button } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import CodeEditor from './CodeEditor.svelte';
    import { useFilesStore } from './files.svelte';

    /**
     * File editor, ported from FileEditContainer.tsx. Handles both actions from the
     * legacy table: `edit/*` loads the file and `new/*` starts an empty document that
     * is saved under the name picked in the dialog.
     */
    let { store, params, rest = '' }: { store: ServerStore; params: Record<string, string>; rest?: string } = $props();

    const files = useFilesStore();

    const action = $derived(params.action === 'new' ? 'new' : 'edit');
    // The wildcard captures the encoded path; the editor always works on decoded paths.
    const filename = $derived(decodeURIComponent(rest));

    let content = $state('');
    // Intentionally the mount-time value: `params` never changes within one editor mount
    // (the route re-keys on the action segment), so the load state is decided once.
    let loading = $state(params.action === 'new' ? false : true);
    let loadError = $state('');
    let saving = $state(false);
    let saveError = $state('');
    let language = $state<LanguageDescription>();
    let newNameOpen = $state(false);
    let newName = $state('');
    let newNameError = $state('');

    // Keep the breadcrumb directory in sync, like the legacy setDirectory(dirname) call.
    $effect(() => {
        const segments = filename.split('/');
        files.directory = segments.slice(0, -1).join('/') || '/';
    });

    $effect(() => {
        if (action === 'new' || filename === '') return;

        loadError = '';
        loading = true;
        getFileContents(store.server!.uuid, filename)
            .then(body => (content = body))
            .catch(error => {
                console.error(error);
                loadError = httpErrorToHuman(error);
            })
            .finally(() => (loading = false));
    });

    let getContent: (() => string) | null = null;

    async function save(name?: string) {
        if (!getContent) return;

        saving = true;
        saveError = '';
        try {
            await saveFileContents(store.server!.uuid, name ?? filename, getContent());

            if (name) {
                navigate(`/server/${store.server!.id}/files/edit/${encodePathSegments(name)}`);
            }
        } catch (error) {
            console.error(error);
            saveError = httpErrorToHuman(error);
        } finally {
            saving = false;
        }
    }

    function onContentSaved() {
        if (action === 'new') {
            newName = filename;
            newNameError = '';
            newNameOpen = true;
        } else {
            void save();
        }
    }

    function submitNewName() {
        newNameError = '';
        const name = newName.trim().replace(/^\//, '');
        if (!name) {
            newNameError = '请填写文件名。';
            return;
        }

        newNameOpen = false;
        void save(name);
    }

    const languageOptions = $derived(languages.filter(l => l.name).sort((a, b) => a.name.localeCompare(b.name)));
    const isPteroIgnore = $derived(filename === '.pteroignore');
</script>

<svelte:head>
    <title>{filename || '新建文件'} | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if loadError}
        <Alert variant="destructive" title="无法加载文件">
            {loadError}
            <button type="button" class="ml-2 underline" onclick={() => navigate(`/server/${store.server!.id}/files`)}>
                返回文件列表
            </button>
        </Alert>
    {:else}
        <!-- Breadcrumbs, ported from FileManagerBreadcrumbs' withinFileEditor mode. -->
        <nav class="mb-4 flex flex-wrap items-center text-sm text-muted-foreground" aria-label="目录">
            <span class="px-0.5">/</span>
            <button
                type="button"
                class="px-1 text-foreground/90 hover:underline"
                onclick={() => navigate(`/server/${store.server!.id}/files`)}
            >
                根目录
            </button>
            <span class="px-0.5">/</span>
            {#each files.directory.split('/').filter(Boolean) as crumb, index (crumb)}
                {@const crumbs = files.directory.split('/').filter(Boolean)}
                {@const crumbPath = crumbs.slice(0, index + 1).join('/')}
                <button
                    type="button"
                    class="px-1 text-foreground/90 hover:underline"
                    onclick={() => navigate(`/server/${store.server!.id}/files#${encodePathSegments(crumbPath)}`)}
                >
                    {crumb}
                </button>
                <span class="px-0.5">/</span>
            {/each}
            {#if filename}
                <span class="px-1 text-muted-foreground/80">{filename.split('/').pop()}</span>
            {/if}
        </nav>

        {#if isPteroIgnore}
            <Alert variant="info" class="mb-4">
                你正在编辑 <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">.pteroignore</code>
                文件。其中列出的文件与目录将不包含在备份中，支持通配符
                <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">*</code>，也可以用
                <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">!</code> 取消之前的规则。
            </Alert>
        {/if}

        <div class="relative">
            {#if loading}
                <div class="flex h-[60vh] items-center justify-center rounded-md border border-border">
                    <Spinner centered />
                </div>
            {:else}
                <CodeEditor
                    {content}
                    {filename}
                    {language}
                    registerContent={get => (getContent = get)}
                    onSave={onContentSaved}
                    onLanguageChanged={l => (language = l)}
                    class="h-[60vh] overflow-hidden rounded-md border border-border"
                />
            {/if}
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
            {#if saveError}
                <Alert variant="destructive" class="mr-auto">{saveError}</Alert>
            {/if}

            <div class="w-full sm:w-52">
                <!-- Legacy shows every known language; the editor falls back to plain text. -->
                <select
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={language?.name ?? ''}
                    onchange={e => {
                        language = languages.find(l => l.name === e.currentTarget.value);
                    }}
                    aria-label="语法高亮语言"
                >
                    <option value="">纯文本</option>
                    {#each languageOptions as option (option.name)}
                        <option value={option.name}>{option.name}</option>
                    {/each}
                </select>
            </div>

            {#if action === 'edit'}
                {#if store.can('file.update')}
                    <Button class="flex-1 sm:flex-none" loading={saving} onclick={() => void save()}>保存内容</Button>
                {/if}
            {:else if store.can('file.create')}
                <Button class="flex-1 sm:flex-none" onclick={() => (newNameOpen = true)}>创建文件</Button>
            {/if}
        </div>
    {/if}
</div>

<!-- New file name dialog, ported from FileNameModal.tsx. -->
<Dialog bind:open={newNameOpen} title="创建文件" onOpenChange={open => open || (newNameError = '')}>
    <div class="space-y-3">
        {#if newNameError}
            <Alert variant="destructive">{newNameError}</Alert>
        {/if}
        <div>
            <Label for="new-file-name">文件名</Label>
            <Input id="new-file-name" bind:value={newName} placeholder="例如 config.yml" />
        </div>
        <p class="text-sm text-muted-foreground">输入此文件保存时使用的名称。</p>
    </div>
    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (newNameOpen = false)}>取消</Button>
        <Button size="sm" onclick={submitNewName}>创建文件</Button>
    {/snippet}
</Dialog>
