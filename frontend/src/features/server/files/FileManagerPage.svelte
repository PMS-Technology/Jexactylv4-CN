<script lang="ts">
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import {
        ChevronDown,
        ChevronUp,
        Ellipsis,
        FileArchive,
        FileText,
        Folder,
        FolderPlus,
        Import,
        LayoutGrid,
        List,
        Search,
        X,
    } from '@lucide/svelte';
    import axios from 'axios';
    import { app } from '$lib/stores/app.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { httpErrorToHuman } from '$lib/api/http';
    import {
        chmodFiles,
        compressFiles,
        copyFile,
        createDirectory,
        deleteFiles,
        decompressFiles,
        getFileDownloadUrl,
        getFileUploadUrl,
        loadDirectory,
        renameFiles,
    } from '$lib/api/files';
    import { bytesToString, formatDateTime, formatIp } from '$lib/utils/format';
    import { cleanDirectoryPath, encodePathSegments, hashToPath, pathJoin } from '$lib/utils/files';
    import { Button, Checkbox } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import CopyButton from '$lib/components/CopyButton.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import type { FileObject } from '$lib/api/definitions/server';
    import { useFilesStore, type SortField } from './files.svelte';

    /**
     * File manager, ported from FileManagerContainer.tsx and its children: breadcrumbs,
     * list/grid rows, the per-file dropdown menu, the upload overlay and progress dialog,
     * the new-directory / rename / chmod dialogs, the mass actions bar and the SFTP box.
     */
    let { store }: { store: ServerStore } = $props();

    const files = useFilesStore();
    const queryClient = useQueryClient();

    // Directory follows the URL hash exactly like the legacy useFileManagerSwr setup:
    // every navigation within /server/:id/files mutates `location.hash`, so deep links
    // and the sidebar entry both work without extra route entries.
    $effect(() => {
        files.setDirectory(hashToPath(router.hash));
        files.clearSelection();
    });

    const directoryKey = $derived(cleanDirectoryPath(files.directory));
    const filesQuery = createQuery(() => ({
        queryKey: ['files', store.server!.uuid, directoryKey],
        queryFn: () => loadDirectory(store.server!.uuid, directoryKey),
        // The legacy SWR setup throttled refocus to 30s and disabled the other hooks.
        refetchInterval: 0,
        retry: 2,
    }));

    function invalidate() {
        void queryClient.invalidateQueries({ queryKey: ['files', store.server!.uuid] });
    }

    // --- selection ---------------------------------------------------------
    const selectedLength = $derived(files.selectedFiles.length);
    const allSelected = $derived(
        filesQuery.data ? filesQuery.data.length > 0 && selectedLength === filesQuery.data.length : false,
    );

    function onSelectAll(checked: boolean) {
        files.setSelectedFiles(checked ? (filesQuery.data?.map(file => file.name) ?? []) : []);
    }

    // --- filter / sort -----------------------------------------------------
    const filteredFiles = $derived.by(() => {
        const list = filesQuery.data ?? [];
        const term = files.searchTerm.trim().toLowerCase();

        return term ? list.filter(file => file.name.toLowerCase().includes(term)) : list;
    });

    // Ported from the legacy sortFiles: directories first, then the chosen field.
    const sortedFiles = $derived.by(() => {
        const sorted = [...filteredFiles].sort((a, b) => {
            if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;

            let comparison = 0;
            switch (files.sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'modified':
                    comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
                    break;
                case 'size':
                    comparison = a.size - b.size;
                    break;
                case 'type': {
                    const extA = a.isFile ? (a.name.split('.').pop()?.toLowerCase() ?? '') : '';
                    const extB = b.isFile ? (b.name.split('.').pop()?.toLowerCase() ?? '') : '';
                    comparison = extA.localeCompare(extB);
                    break;
                }
            }

            return files.sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted.filter((file, index) => index === 0 || file.name !== sorted[index - 1]?.name);
    });

    const displayFiles = $derived(sortedFiles.slice(0, 250));

    const sortOptions: [SortField, string][] = [
        ['name', '名称'],
        ['modified', '修改时间'],
        ['size', '大小'],
        ['type', '类型'],
    ];

    function handleSortField(field: SortField) {
        if (field === files.sortField) {
            files.sortDirection = files.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            files.sortField = field;
            files.sortDirection = 'asc';
        }
    }

    // --- navigation --------------------------------------------------------
    const canRead = $derived(store.can('file.read'));
    const canReadContents = $derived(store.can('file.read-content'));

    // Mirrors the legacy Clickable: a file is only openable when it is editable and the
    // user may read contents; a directory only when the user may list it.
    function isClickable(file: FileObject): boolean {
        return file.isFile
            ? file.isEditable() && canReadContents
            : canRead;
    }

    function openFile(file: FileObject) {
        if (!isClickable(file)) return;

        const path = encodePathSegments(pathJoin(directoryKey, file.name)).replace(/^\//, '');
        if (file.isFile) {
            navigate(`/server/${store.server!.id}/files/edit/${path}`);
        } else {
            navigate(`/server/${store.server!.id}/files#${path}`);
        }
    }

    // --- per-file dropdown -------------------------------------------------
    let dropdownFor = $state<string | null>(null);
    let dropdownX = $state(0);
    let dropdownY = $state(0);

    function openDropdown(file: FileObject, x: number, y: number) {
        dropdownX = x;
        dropdownY = y;
        dropdownFor = file.key;
    }

    let modal = $state<{ type: 'rename' | 'move' | 'chmod'; name: string; modeBits: string } | null>(null);
    let deleteTarget = $state<FileObject | null>(null);
    // ConfirmDialog owns `open` through bind; keep it in sync with the target.
    let deleteDialogShown = $state(false);

    function requestDelete(file: FileObject) {
        deleteTarget = file;
        deleteDialogShown = true;
    }
    let actionError = $state('');
    let deleting = $state(false);

    function closeDropdown() {
        dropdownFor = null;
    }

    async function doDelete() {
        if (!store.server || !deleteTarget) return;

        deleting = true;
        try {
            await deleteFiles(store.server!.uuid, directoryKey, [deleteTarget.name]);
            invalidate();
            deleteTarget = null;
            deleteDialogShown = false;
        } finally {
            deleting = false;
        }
    }

    async function doCopy(file: FileObject) {
        closeDropdown();
        actionError = '';
        try {
            await copyFile(store.server!.uuid, pathJoin(directoryKey, file.name));
            invalidate();
        } catch (error) {
            actionError = httpErrorToHuman(error);
        }
    }

    function doDownload(file: FileObject) {
        closeDropdown();

        getFileDownloadUrl(store.server!.uuid, pathJoin(directoryKey, file.name))
            .then(url => (window.location.href = url))
            .catch(error => (actionError = httpErrorToHuman(error)));
    }

    async function doArchive(file: FileObject) {
        closeDropdown();
        actionError = '';
        try {
            await compressFiles(store.server!.uuid, directoryKey, [file.name]);
            invalidate();
        } catch (error) {
            actionError = httpErrorToHuman(error);
        }
    }

    async function doUnarchive(file: FileObject) {
        closeDropdown();
        actionError = '';
        try {
            await decompressFiles(store.server!.uuid, directoryKey, file.name);
            invalidate();
        } catch (error) {
            actionError = httpErrorToHuman(error);
        }
    }

    // --- new directory -----------------------------------------------------
    let newDirOpen = $state(false);
    let newDirName = $state('');
    let newDirError = $state('');
    let creatingDir = $state(false);

    const newDirPath = $derived(pathJoin(directoryKey, newDirName).replace(/^(\.\.\/|\/)+/, ''));

    async function createNewDirectory() {
        newDirError = '';
        if (!newDirName.trim()) {
            newDirError = '请填写目录名称。';
            return;
        }

        creatingDir = true;
        try {
            await createDirectory(store.server!.uuid, directoryKey, newDirName);
            invalidate();
            newDirOpen = false;
            newDirName = '';
        } catch (error) {
            newDirError = httpErrorToHuman(error);
        } finally {
            creatingDir = false;
        }
    }

    // --- rename / chmod (single file) ---------------------------------------
    let renameValue = $state('');
    let renameError = $state('');
    let savingModal = $state(false);

    function openRenameModal(type: 'rename' | 'move', file: FileObject) {
        modal = { type, name: file.name, modeBits: file.modeBits };
        renameValue = file.name;
        renameError = '';
        closeDropdown();
    }

    function openChmodModal(file: FileObject) {
        modal = { type: 'chmod', name: file.name, modeBits: file.modeBits };
        chmodMode = file.modeBits;
        chmodError = '';
        closeDropdown();
    }

    async function submitRename() {
        renameError = '';
        const name = renameValue.trim();
        if (!name) {
            renameError = '请填写名称。';
            return;
        }

        savingModal = true;
        try {
            await renameFiles(store.server!.uuid, directoryKey, [{ from: modal!.name, to: name }]);
            invalidate();
            modal = null;
        } catch (error) {
            renameError = httpErrorToHuman(error);
        } finally {
            savingModal = false;
        }
    }

    let chmodMode = $state('');
    let chmodError = $state('');

    async function submitChmod() {
        chmodError = '';
        if (!/^[0-7]{3,4}$/.test(chmodMode)) {
            chmodError = '权限必须是 3-4 位八进制数，例如 0644。';
            return;
        }

        savingModal = true;
        try {
            await chmodFiles(store.server!.uuid, directoryKey, [{ file: modal!.name, mode: chmodMode }]);
            invalidate();
            modal = null;
        } catch (error) {
            chmodError = httpErrorToHuman(error);
        } finally {
            savingModal = false;
        }
    }

    // --- uploads -----------------------------------------------------------
    const canCreate = $derived(store.can('file.create'));
    let uploadInput = $state<HTMLInputElement>();
    let dragOver = $state(false);
    let uploadPanelOpen = $state(false);

    const uploadCount = $derived(Object.keys(files.uploads).length);
    const uploadPercent = $derived.by(() => {
        const all = Object.values(files.uploads);
        const loaded = all.reduce((sum, f) => sum + f.loaded, 0);
        const total = all.reduce((sum, f) => sum + f.total, 0);

        return total > 0 ? (loaded / total) * 100 : 0;
    });

    // Ported from UploadButton's isFileOrDirectory.
    function isFileDrag(event: DragEvent): boolean {
        return Boolean(event.dataTransfer?.types?.some(value => value.toLowerCase() === 'files'));
    }

    function onFileSubmission(list: FileList) {
        actionError = '';
        const uploads = Array.from(list);
        // Directories come through as zero-size, typeless entries (4096 on some browsers).
        if (uploads.some(file => !file.type && (!file.size || file.size === 4096))) {
            actionError = '不支持上传文件夹。';
            return;
        }

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        const tasks = uploads.map(file => {
            const controller = new AbortController();
            files.pushFileUpload(file.name, { abort: controller, loaded: 0, total: file.size });

            return () =>
                getFileUploadUrl(store.server!.uuid)
                    .then(url =>
                        axios.post(url, { files: file }, {
                            signal: controller.signal,
                            headers: { 'Content-Type': 'multipart/form-data' },
                            params: { directory: directoryKey },
                            onUploadProgress: (progress: { loaded: number }) =>
                                files.setUploadProgress(file.name, progress.loaded),
                        }),
                    )
                    .then(() => timeouts.push(setTimeout(() => files.removeFileUpload(file.name), 500)));
        });

        Promise.all(tasks.map(fn => fn()))
            .then(() => invalidate())
            .catch(error => {
                if (!axios.isCancel(error)) actionError = httpErrorToHuman(error);
                files.clearFileUploads();
            });
    }

    $effect(() => {
        if (uploadCount === 0) uploadPanelOpen = false;
    });

    // --- mass actions ------------------------------------------------------
    let massBusy = $state(false);
    let massMessage = $state('');
    let massConfirmDelete = $state(false);
    let massMoveOpen = $state(false);

    function openMassMove() {
        renameValue = '';
        renameError = '';
        massMoveOpen = true;
    }

    async function submitMassMove() {
        renameError = '';
        const name = renameValue.trim();
        if (!name) {
            renameError = '请填写目标目录。';
            return;
        }

        massBusy = true;
        try {
            await renameFiles(
                store.server!.uuid,
                directoryKey,
                files.selectedFiles.map(f => ({ from: f, to: pathJoin(name, f) })),
            );
            invalidate();
            files.clearSelection();
            massMoveOpen = false;
        } catch (error) {
            renameError = httpErrorToHuman(error);
        } finally {
            massBusy = false;
        }
    }

    async function massCompress() {
        massBusy = true;
        massMessage = '正在压缩文件……';
        try {
            await compressFiles(store.server!.uuid, directoryKey, files.selectedFiles);
            invalidate();
            files.clearSelection();
        } catch (error) {
            actionError = httpErrorToHuman(error);
        } finally {
            massBusy = false;
            massMessage = '';
        }
    }

    async function massDelete() {
        massBusy = true;
        massConfirmDelete = false;
        massMessage = '正在删除文件……';
        try {
            await deleteFiles(store.server!.uuid, directoryKey, files.selectedFiles);
            invalidate();
            files.clearSelection();
        } catch (error) {
            actionError = httpErrorToHuman(error);
        } finally {
            massBusy = false;
            massMessage = '';
        }
    }

    // --- SFTP --------------------------------------------------------------
    const sftp = $derived(store.server!.sftpDetails);
    const sftpUsername = $derived(`${app.user?.username}.${store.server!.id}`);
    const sftpAddress = $derived(`sftp://${formatIp(sftp.ip)}:${sftp.port}`);
    const sftpLink = $derived(`sftp://${sftpUsername}@${formatIp(sftp.ip)}:${sftp.port}`);
</script>

<svelte:head>
    <title>文件管理 | {store.server?.name} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

{#snippet rowIcon(file: FileObject)}
    {#if file.isFile}
        {#if file.isSymlink}
            <Import class="size-4" />
        {:else if file.isArchiveType()}
            <FileArchive class="size-4" />
        {:else}
            <FileText class="size-4" />
        {/if}
    {:else}
        <Folder class="size-4" />
    {/if}
{/snippet}

{#snippet fileMenu(file: FileObject)}
    {#if dropdownFor === file.key}
        <!-- Click-away catcher; the menu itself stops propagation. -->
        <div
            class="fixed inset-0 z-40"
            role="presentation"
            onclick={closeDropdown}
            onkeydown={e => e.key === 'Escape' && closeDropdown()}
        >
            <div
                class="absolute z-50 w-52 rounded-md border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
                style="top: {Math.min(dropdownY, window.innerHeight - 40)}px; left: {Math.min(dropdownX, window.innerWidth - 224)}px"
                onclick={e => e.stopPropagation()}
                onkeydown={e => e.stopPropagation()}
                role="menu"
                tabindex="-1"
            >
                {#if store.can('file.update')}
                    <button class="menu-item" onclick={() => openRenameModal('rename', file)}>重命名</button>
                    <button class="menu-item" onclick={() => openRenameModal('move', file)}>移动</button>
                    <button class="menu-item" onclick={() => openChmodModal(file)}>权限</button>
                {/if}
                {#if file.isFile && store.can('file.create')}
                    <button class="menu-item" onclick={() => doCopy(file)}>复制文件</button>
                {/if}
                {#if file.isArchiveType() && store.can('file.create')}
                    <button class="menu-item" onclick={() => doUnarchive(file)}>解压文件</button>
                {:else if store.can('file.archive')}
                    <button class="menu-item" onclick={() => doArchive(file)}>压缩文件</button>
                {/if}
                {#if file.isFile}
                    <button class="menu-item" onclick={() => doDownload(file)}>下载</button>
                {/if}
                {#if store.can('file.archive')}
                    <button
                        class="menu-item text-destructive"
                        onclick={() => {
                            closeDropdown();
                            requestDelete(file);
                        }}
                    >
                        删除
                    </button>
                {/if}
            </div>
        </div>
    {/if}
{/snippet}

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    {#if actionError}
        <Alert variant="destructive" class="mb-4">{actionError}</Alert>
    {/if}

    <PageHeader title="文件管理" description="在网页界面管理服务器上的文件与目录。">
        {#snippet children()}
            <Button variant="outline" size="sm" onclick={() => files.toggleViewMode()} title="切换列表/网格视图">
                {#if files.viewMode === 'grid'}
                    <List class="size-4" />
                {:else}
                    <LayoutGrid class="size-4" />
                {/if}
            </Button>
            {#if store.can('file.create')}
                <Button size="sm" onclick={() => navigate(`/server/${store.server!.id}/files/new${router.hash}`)}>
                    新建文件
                </Button>
            {/if}
        {/snippet}
    </PageHeader>

    <!-- Breadcrumbs + actions -->
    <div class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <Checkbox checked={allSelected} onCheckedChange={onSelectAll} aria-label="全选" />

        <nav class="flex min-w-0 flex-1 items-center overflow-x-hidden text-sm text-muted-foreground" aria-label="目录">
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
                {#if index === crumbs.length - 1}
                    <span class="px-1 text-muted-foreground/80">{crumb}</span>
                {:else}
                    <button
                        type="button"
                        class="px-1 text-foreground/90 hover:underline"
                        onclick={() => navigate(`/server/${store.server!.id}/files#${encodePathSegments(crumbPath)}`)}
                    >
                        {crumb}
                    </button>
                    <span class="px-0.5">/</span>
                {/if}
            {/each}
        </nav>

        {#if store.can('file.create')}
            <div class="flex flex-wrap items-center gap-2">
                {#if uploadCount > 0}
                    <button
                        type="button"
                        class="relative inline-flex size-9 items-center justify-center rounded-md border border-border transition-colors hover:bg-accent"
                        title="正在上传 {uploadCount} 个文件，点击查看"
                        onclick={() => (uploadPanelOpen = true)}
                    >
                        <svg viewBox="0 0 32 32" class="absolute size-7">
                            <circle cx="16" cy="16" r="14" stroke-width="3" fill="none" stroke="currentColor" class="opacity-25" />
                            <circle
                                cx="16"
                                cy="16"
                                r="14"
                                stroke-width="3"
                                fill="none"
                                stroke="currentColor"
                                stroke-dasharray={28 * Math.PI}
                                stroke-dashoffset={((100 - uploadPercent) / 100) * 28 * Math.PI}
                                class="origin-center -rotate-90 transition-[stroke-dashoffset] duration-300"
                            />
                        </svg>
                    </button>
                {/if}
                <Button variant="outline" size="sm" onclick={() => (newDirOpen = true)}>
                    <FolderPlus class="size-4" />
                    新建目录
                </Button>
                <Button variant="outline" size="sm" onclick={() => uploadInput?.click()}>上传</Button>
            </div>
        {/if}
    </div>

    <!-- Sort + search -->
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium text-muted-foreground">排序：</span>
            {#each sortOptions as [field, label] (field)}
                <Button size="sm" variant={files.sortField === field ? 'default' : 'outline'} onclick={() => handleSortField(field)}>
                    {label}
                    {#if files.sortField === field}
                        {#if files.sortDirection === 'asc'}
                            <ChevronUp class="size-3.5" />
                        {:else}
                            <ChevronDown class="size-3.5" />
                        {/if}
                    {/if}
                </Button>
            {/each}
        </div>
        <div class="relative max-w-xs flex-1">
            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="text" placeholder="搜索文件……" bind:value={files.searchTerm} aria-label="按名称搜索文件" class="pl-9" />
        </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-4">
        <div class="xl:col-span-3">
            {#if filesQuery.isPending}
                <Spinner centered />
            {:else if filesQuery.error}
                <Alert variant="destructive" title="无法加载目录">
                    {httpErrorToHuman(filesQuery.error)}
                    <button type="button" class="ml-2 underline" onclick={() => void filesQuery.refetch()}>重试</button>
                </Alert>
            {:else if !filteredFiles.length}
                <p class="py-8 text-center text-sm text-muted-foreground">
                    {files.searchTerm ? '没有匹配搜索条件的文件。' : '此目录是空的。'}
                </p>
            {:else}
                {#if filteredFiles.length > 250}
                    <div class="mb-px rounded bg-warning/15 p-3 text-center text-sm text-warning">
                        {files.searchTerm
                            ? `找到 ${filteredFiles.length} 个匹配文件，仅显示前 250 个。`
                            : '此目录文件过多，仅显示前 250 个文件。'}
                    </div>
                {:else if files.searchTerm}
                    <div class="mb-px rounded bg-primary/15 p-3 text-center text-sm">
                        找到 {filteredFiles.length} 个匹配 “{files.searchTerm}” 的文件
                    </div>
                {/if}

                {#if files.viewMode === 'grid'}
                    <div class="grid grid-cols-2 gap-2 lg:grid-cols-6 lg:gap-4">
                        {#each displayFiles as file (file.key)}
                            <div class="group relative rounded-md border border-border bg-card p-2 transition-colors hover:bg-accent">
                                <button
                                    type="button"
                                    class="absolute right-1 top-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    onclick={e => openDropdown(file, e.clientX, e.clientY)}
                                    aria-label="{file.name} 的操作"
                                >
                                    <Ellipsis class="size-4" />
                                </button>
                                <button
                                    type="button"
                                    class="flex w-full flex-col items-center gap-2 pt-6 text-center"
                                    onclick={() => openFile(file)}
                                    oncontextmenu={e => {
                                        e.preventDefault();
                                        openDropdown(file, e.clientX, e.clientY);
                                    }}
                                >
                                    <span class="text-primary">{@render rowIcon(file)}</span>
                                    <span class="mb-4 line-clamp-2 w-full break-all text-xs text-muted-foreground">{file.name}</span>
                                </button>
                                {#if dropdownFor === file.key}
                                    {@render fileMenu(file)}
                                {/if}
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div class="overflow-hidden rounded-md border border-border">
                        {#each displayFiles as file (file.key)}
                            <div class="group relative flex items-center border-b border-border bg-card text-sm transition-colors last:border-b-0 hover:bg-accent">
                                <div class="z-10 flex-none pl-3">
                                    <Checkbox
                                        checked={files.selectedFiles.includes(file.name)}
                                        onCheckedChange={checked =>
                                            checked
                                                ? files.appendSelectedFile(file.name)
                                                : files.removeSelectedFile(file.name)}
                                        aria-label="选择 {file.name}"
                                    />
                                </div>

                                {#if isClickable(file)}
                                    <button
                                        type="button"
                                        class="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
                                        onclick={() => openFile(file)}
                                        oncontextmenu={e => {
                                            e.preventDefault();
                                            openDropdown(file, e.clientX, e.clientY);
                                        }}
                                    >
                                        <span class="ml-3 flex-none text-muted-foreground">{@render rowIcon(file)}</span>
                                        <span class="min-w-0 flex-1 truncate">{file.name}</span>
                                        {#if file.isFile}
                                            <span class="mr-2 hidden w-24 flex-none text-right text-muted-foreground sm:block">
                                                {bytesToString(file.size)}
                                            </span>
                                        {/if}
                                        <span
                                            class="mr-2 hidden w-40 flex-none text-right text-muted-foreground/70 md:block"
                                            title={formatDateTime(file.modifiedAt)}
                                        >
                                            {Math.abs(differenceInHours(file.modifiedAt, new Date())) > 48
                                                ? format(file.modifiedAt, 'yyyy-MM-dd HH:mm')
                                                : formatDistanceToNow(file.modifiedAt, { addSuffix: true, locale: zhCN })}
                                        </span>
                                    </button>
                                {:else}
                                    <div class="flex min-w-0 flex-1 cursor-default items-center gap-3 px-3 py-2 text-left text-muted-foreground">
                                        <span class="ml-3 flex-none">{@render rowIcon(file)}</span>
                                        <span class="min-w-0 flex-1 truncate">{file.name}</span>
                                        {#if file.isFile}
                                            <span class="mr-2 hidden w-24 flex-none text-right sm:block">{bytesToString(file.size)}</span>
                                        {/if}
                                        <span
                                            class="mr-2 hidden w-40 flex-none text-right text-muted-foreground/70 md:block"
                                            title={formatDateTime(file.modifiedAt)}
                                        >
                                            {Math.abs(differenceInHours(file.modifiedAt, new Date())) > 48
                                                ? format(file.modifiedAt, 'yyyy-MM-dd HH:mm')
                                                : formatDistanceToNow(file.modifiedAt, { addSuffix: true, locale: zhCN })}
                                        </span>
                                    </div>
                                {/if}

                                <button
                                    type="button"
                                    class="mr-2 rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    onclick={e => openDropdown(file, e.clientX, e.clientY)}
                                    aria-label="{file.name} 的操作"
                                >
                                    <Ellipsis class="size-4" />
                                </button>
                                {#if dropdownFor === file.key}
                                    {@render fileMenu(file)}
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>

        {#if store.can('file.sftp')}
            <div class="mt-6 xl:mt-0">
                <div class="rounded-lg border border-border bg-card">
                    <div class="border-b border-border px-4 py-3">
                        <h2 class="font-header text-sm font-semibold">SFTP 信息</h2>
                    </div>
                    <div class="space-y-4 p-4">
                        <div>
                            <Label>服务器地址</Label>
                            <div class="mt-1.5 flex items-center gap-2">
                                <Input readonly value={sftpAddress} class="font-mono text-xs" />
                                <CopyButton text={sftpAddress} />
                            </div>
                        </div>
                        <div>
                            <Label>用户名</Label>
                            <div class="mt-1.5 flex items-center gap-2">
                                <Input readonly value={sftpUsername} class="font-mono text-xs" />
                                <CopyButton text={sftpUsername} />
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <p class="flex-1 border-l-4 border-info/60 pl-2 text-xs text-muted-foreground">
                                SFTP 密码与面板登录密码相同。
                            </p>
                            <a href={sftpLink} class="shrink-0">
                                <Button variant="secondary" size="sm">打开 SFTP</Button>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<!-- Upload drag overlay, ported from UploadButton.tsx. -->
<svelte:window
    ondragenter={e => {
        e.preventDefault();
        if (canCreate && isFileDrag(e)) dragOver = true;
    }}
    ondragover={e => e.preventDefault()}
    ondragleave={e => {
        if (!e.relatedTarget) dragOver = false;
    }}
    ondrop={e => {
        e.preventDefault();
        dragOver = false;
        if (canCreate && e.dataTransfer?.files.length) onFileSubmission(e.dataTransfer.files);
    }}
    onkeydown={() => (dragOver = false)}
/>

{#if canCreate && dragOver}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="presentation">
        <div class="mx-10 flex w-full max-w-sm items-center gap-4 rounded bg-black p-6 ring-4 ring-blue-200/60">
            <Import class="size-10 shrink-0" />
            <p class="flex-1 text-center font-header text-lg text-neutral-100">拖拽文件到此处上传。</p>
        </div>
    </div>
{/if}

{#if canCreate}
    <input
        type="file"
        multiple
        class="hidden"
        bind:this={uploadInput}
        onchange={e => {
            if (e.currentTarget.files) onFileSubmission(e.currentTarget.files);
            e.currentTarget.files = null;
        }}
    />
{/if}

<!-- Upload progress dialog, ported from FileManagerStatus.tsx. -->
<Dialog bind:open={uploadPanelOpen} title="文件上传" description="以下文件正在上传到服务器。">
    <div class="space-y-2">
        {#each Object.entries(files.uploads).sort(([a], [b]) => a.localeCompare(b)) as [name, upload] (name)}
            <div class="flex items-center gap-3 rounded bg-muted p-3">
                <svg viewBox="0 0 32 32" class="size-6 shrink-0">
                    <circle cx="16" cy="16" r="14" stroke-width="3" fill="none" stroke="currentColor" class="opacity-25" />
                    <circle
                        cx="16"
                        cy="16"
                        r="14"
                        stroke-width="3"
                        fill="none"
                        stroke="currentColor"
                        stroke-dasharray={28 * Math.PI}
                        stroke-dashoffset={((100 - (upload.loaded / Math.max(upload.total, 1)) * 100) / 100) * 28 * Math.PI}
                        class="origin-center -rotate-90 transition-[stroke-dashoffset] duration-300"
                    />
                </svg>
                <span class="min-w-0 flex-1 truncate font-mono text-xs">{name}</span>
                <button
                    type="button"
                    class="text-muted-foreground transition-colors hover:text-foreground"
                    onclick={() => files.cancelFileUpload(name)}
                    aria-label="取消上传 {name}"
                >
                    <X class="size-4" />
                </button>
            </div>
        {/each}
    </div>
    {#snippet footer()}
        <Button variant="destructive" size="sm" onclick={() => files.clearFileUploads()}>取消全部上传</Button>
        <Button variant="ghost" size="sm" onclick={() => (uploadPanelOpen = false)}>关闭</Button>
    {/snippet}
</Dialog>

<!-- New directory dialog, ported from NewDirectoryButton.tsx. -->
<Dialog bind:open={newDirOpen} title="新建目录" onOpenChange={open => open || (newDirError = '')}>
    <div class="space-y-3">
        {#if newDirError}
            <Alert variant="destructive">{newDirError}</Alert>
        {/if}
        <div>
            <Label for="directory-name">名称</Label>
            <Input id="directory-name" bind:value={newDirName} placeholder="例如 plugins" />
        </div>
        <p class="break-all text-sm text-muted-foreground">
            目录将创建为
            <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-info">/home/container/{newDirPath}</code>
        </p>
    </div>
    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (newDirOpen = false)}>取消</Button>
        <Button size="sm" loading={creatingDir} onclick={createNewDirectory}>创建</Button>
    {/snippet}
</Dialog>

<!-- Rename / move dialog, ported from RenameFileModal.tsx. -->
<Dialog
    open={modal !== null && modal.type !== 'chmod'}
    title={modal?.type === 'move' ? '移动文件' : '重命名'}
    onOpenChange={open => {
        if (!open) modal = null;
    }}
>
    {#if modal && modal.type !== 'chmod'}
        <div class="space-y-3">
            {#if renameError}
                <Alert variant="destructive">{renameError}</Alert>
            {/if}
            <div>
                <Label for="file-name">名称</Label>
                <Input id="file-name" bind:value={renameValue} />
            </div>
            {#if modal.type === 'move'}
                <p class="text-xs text-muted-foreground">
                    <strong class="text-foreground/90">新位置：</strong>
                    /home/container/{pathJoin(directoryKey, renameValue).replace(/^(\.\.\/|\/)+/, '')}
                </p>
            {/if}
        </div>
    {/if}
    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (modal = null)}>取消</Button>
        <Button size="sm" loading={savingModal} onclick={submitRename}>
            {modal?.type === 'move' ? '移动' : '重命名'}
        </Button>
    {/snippet}
</Dialog>

<!-- Chmod dialog, ported from ChmodFileModal.tsx. -->
<Dialog
    open={modal?.type === 'chmod'}
    title="修改权限"
    onOpenChange={open => {
        if (!open) modal = null;
    }}
>
    {#if modal && modal.type === 'chmod'}
        <div class="space-y-3">
            {#if chmodError}
                <Alert variant="destructive">{chmodError}</Alert>
            {/if}
            <div>
                <Label for="file-mode">权限（八进制）</Label>
                <Input id="file-mode" bind:value={chmodMode} placeholder="0644" />
            </div>
        </div>
    {/if}
    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (modal = null)}>取消</Button>
        <Button size="sm" loading={savingModal} onclick={submitChmod}>更新</Button>
    {/snippet}
</Dialog>

<!-- Single-file delete confirm, ported from FileDropdownMenu.tsx. -->
<ConfirmDialog
    bind:open={deleteDialogShown}
    title="删除{deleteTarget?.isFile ? '文件' : '目录'}"
    confirmLabel="删除"
    disabled={deleting}
    onConfirm={doDelete}
>
    删除后将无法恢复 <span class="font-semibold">{deleteTarget?.name}</span> 的内容。
</ConfirmDialog>

<!-- Mass delete confirm, ported from MassActionsBar.tsx. -->
<ConfirmDialog bind:open={massConfirmDelete} title="删除文件" confirmLabel="删除" disabled={massBusy} onConfirm={massDelete}>
    <p class="mb-2">
        确定要删除 <span class="font-semibold">{selectedLength} 个文件</span> 吗？此操作不可恢复。
    </p>
    {#each files.selectedFiles.slice(0, 15) as name (name)}
        <li class="break-all">{name}</li>
    {/each}
    {#if selectedLength > 15}
        <li>以及另外 {selectedLength - 15} 个文件</li>
    {/if}
</ConfirmDialog>

<!-- Mass move dialog. -->
<Dialog bind:open={massMoveOpen} title="移动文件" onOpenChange={open => open || (renameError = '')}>
    <div class="space-y-3">
        {#if renameError}
            <Alert variant="destructive">{renameError}</Alert>
        {/if}
        <div>
            <Label for="mass-move-target">目标目录</Label>
            <Input id="mass-move-target" bind:value={renameValue} placeholder="例如 datadir" />
        </div>
        <p class="text-xs text-muted-foreground">
            <strong class="text-foreground/90">新位置：</strong>
            /home/container/{pathJoin(directoryKey, renameValue).replace(/^(\.\.\/|\/)+/, '')}
        </p>
    </div>
    {#snippet footer()}
        <Button variant="ghost" size="sm" onclick={() => (massMoveOpen = false)}>取消</Button>
        <Button size="sm" loading={massBusy} onclick={submitMassMove}>移动</Button>
    {/snippet}
</Dialog>

<!-- Mass actions bar, ported from MassActionsBar.tsx. -->
{#if selectedLength > 0}
    <div class="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center md:bottom-6">
        {#if massBusy}
            <div class="pointer-events-auto flex items-center gap-3 rounded-lg border border-border bg-popover px-6 py-4 shadow-lg">
                <Spinner size="sm" />
                <span class="text-sm">{massMessage}</span>
            </div>
        {:else}
            <div class="pointer-events-auto flex items-center gap-4 rounded-lg border border-border bg-popover p-4 shadow-lg">
                <Button size="sm" onclick={openMassMove}>移动</Button>
                <Button size="sm" onclick={massCompress}>压缩</Button>
                <Button variant="destructive" size="sm" onclick={() => (massConfirmDelete = true)}>删除</Button>
            </div>
        {/if}
    </div>
{/if}

<style>
    :global(.menu-item) {
        display: flex;
        width: 100%;
        align-items: center;
        border-radius: calc(var(--radius) - 2px);
        padding: 0.375rem 0.625rem;
        text-align: left;
        font-size: 0.8125rem;
        transition: background-color 75ms;
    }
    :global(.menu-item:hover) {
        background: var(--color-accent);
    }
</style>
