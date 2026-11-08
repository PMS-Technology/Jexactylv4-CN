import http from '$lib/api/http';
import { toFileObject } from '$lib/api/transformers/server';
import type { FileObject } from '$lib/api/definitions/server';

/**
 * File endpoints under `/api/client/servers/:id/files`, ported from
 * `api/routes/server/files.ts` and `directories.ts`. Every write goes through the
 * panel, which proxies to Wings; downloads and uploads use signed URLs.
 */

export async function loadDirectory(uuid: string, directory = '/'): Promise<FileObject[]> {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/list`, {
        params: { directory },
    });

    return (data.data ?? []).map(toFileObject);
}

export async function createDirectory(uuid: string, root: string, name: string): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/files/create-folder`, { root, name });
}

export async function getFileContents(uuid: string, file: string): Promise<string> {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/contents`, {
        params: { file },
        transformResponse: res => res,
        responseType: 'text',
    });

    return data;
}

/** Signed, short-lived URL for downloading a file straight from Wings. */
export async function getFileDownloadUrl(uuid: string, file: string): Promise<string> {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/download`, { params: { file } });

    return data.attributes.url;
}

/** Signed upload URL; POST files to it with `multipart/form-data`. */
export async function getFileUploadUrl(uuid: string): Promise<string> {
    const { data } = await http.get(`/api/client/servers/${uuid}/files/upload`);

    return data.attributes.url;
}

export async function saveFileContents(uuid: string, file: string, content: string): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/files/write`, content, {
        params: { file },
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}

export async function renameFiles(uuid: string, directory: string, files: { to: string; from: string }[]): Promise<void> {
    await http.put(`/api/client/servers/${uuid}/files/rename`, { root: directory, files });
}

export async function copyFile(uuid: string, location: string): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/files/copy`, { location });
}

export async function deleteFiles(uuid: string, directory: string, files: string[]): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/files/delete`, { root: directory, files });
}

export async function compressFiles(uuid: string, directory: string, files: string[]): Promise<FileObject> {
    const { data } = await http.post(
        `/api/client/servers/${uuid}/files/compress`,
        { root: directory, files },
        {
            timeout: 10000,
            timeoutErrorMessage: '生成压缩包耗时较长，完成后会自动出现在文件列表中。',
        },
    );

    return toFileObject(data);
}

export async function decompressFiles(uuid: string, directory: string, file: string): Promise<void> {
    await http.post(
        `/api/client/servers/${uuid}/files/decompress`,
        { root: directory, file },
        {
            timeout: 10000,
            timeoutErrorMessage: '解压耗时较长，完成后解压出的文件会自动出现。',
        },
    );
}

export async function chmodFiles(uuid: string, directory: string, files: { file: string; mode: string }[]): Promise<void> {
    await http.post(`/api/client/servers/${uuid}/files/chmod`, { root: directory, files });
}
