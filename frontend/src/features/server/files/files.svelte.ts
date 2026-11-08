import { getContext, setContext } from 'svelte';

/**
 * Per-server file manager state, replacing the legacy easy-peasy `ServerContext.files`
 * slice. One instance lives in the context of each /server/:id/files mount, so the
 * directory, selection, sort and upload state never bleed between servers or pages.
 */

export type SortField = 'name' | 'modified' | 'size' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface FileUpload {
    /** AbortController for the in-flight request. */
    abort: AbortController;
    loaded: number;
    total: number;
}

export class FilesStore {
    /** Directory path relative to the container root, without leading/trailing slashes. */
    directory = $state('/');
    selectedFiles = $state<string[]>([]);
    sortField = $state<SortField>('name');
    sortDirection = $state<SortDirection>('asc');
    searchTerm = $state('');
    uploads = $state<Record<string, FileUpload>>({});

    /** Lazily hydrated from localStorage; the legacy app persisted the same keys. */
    viewMode = $state<'list' | 'grid'>('list');

    constructor(private serverId: string) {
        try {
            const stored = localStorage.getItem(`${serverId}_file_manager_view`);
            if (stored === 'grid' || stored === 'list') this.viewMode = stored;
        } catch {
            // Private browsing; the default view stands.
        }
    }

    setDirectory(directory: string) {
        this.directory = directory;
    }

    /** The legacy hash-change effect cleared the selection on every navigation. */
    clearSelection() {
        this.selectedFiles = [];
    }

    toggleViewMode() {
        this.viewMode = this.viewMode === 'list' ? 'grid' : 'list';
        try {
            localStorage.setItem(`${this.serverId}_file_manager_view`, JSON.stringify(this.viewMode));
        } catch {
            // Private browsing; the preference just won't persist.
        }
    }

    appendSelectedFile(name: string) {
        if (!this.selectedFiles.includes(name)) this.selectedFiles = [...this.selectedFiles, name];
    }

    removeSelectedFile(name: string) {
        this.selectedFiles = this.selectedFiles.filter(file => file !== name);
    }

    setSelectedFiles(files: string[]) {
        this.selectedFiles = files;
    }

    pushFileUpload(name: string, data: FileUpload) {
        this.uploads = { ...this.uploads, [name]: data };
    }

    removeFileUpload(name: string) {
        const next = { ...this.uploads };
        delete next[name];
        this.uploads = next;
    }

    setUploadProgress(name: string, loaded: number) {
        const upload = this.uploads[name];
        if (!upload) return;

        this.uploads = { ...this.uploads, [name]: { ...upload, loaded } };
    }

    cancelFileUpload(name: string) {
        this.uploads[name]?.abort.abort();
        this.removeFileUpload(name);
    }

    clearFileUploads() {
        for (const upload of Object.values(this.uploads)) upload.abort.abort();
        this.uploads = {};
    }
}

const FILES_STORE_KEY = Symbol('files-store');

/** Provides a fresh store for a server files mount; call in the FilesArea root. */
export function provideFilesStore(serverId: string): FilesStore {
    const store = new FilesStore(serverId);
    setContext(FILES_STORE_KEY, store);

    return store;
}

/** Reads the store of the enclosing server files mount. */
export function useFilesStore(): FilesStore {
    const store = getContext<FilesStore>(FILES_STORE_KEY);
    if (!store) throw new Error('useFilesStore must be used within the files feature');

    return store;
}
