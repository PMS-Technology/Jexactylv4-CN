import http, { type FractalResponseList } from '$lib/api/http';
import { toEggVariable } from '$lib/api/transformers/server';
import type { EggVariable } from '$lib/api/definitions/server';

/** Startup endpoints, ported from `api/routes/server/startup.ts`. */

export interface ServerStartup {
    invocation: string;
    variables: EggVariable[];
    /** Display name → image, as configured on the egg. */
    dockerImages: Record<string, string>;
}

export async function getServerStartup(uuid: string): Promise<ServerStartup> {
    const { data } = await http.get(`/api/client/servers/${uuid}/startup`);

    return {
        variables: ((data as FractalResponseList).data ?? []).map(toEggVariable),
        invocation: data.meta.startup_command,
        dockerImages: data.meta.docker_images || {},
    };
}

export async function setDockerImage(uuid: string, image: string): Promise<void> {
    await http.put(`/api/client/servers/${uuid}/settings/docker-image`, { docker_image: image });
}

/** Returns the updated variable and the re-rendered startup command. */
export async function updateStartupVariable(uuid: string, key: string, value: string): Promise<[EggVariable, string]> {
    const { data } = await http.put(`/api/client/servers/${uuid}/startup/variable`, { key, value });

    return [toEggVariable(data), data.meta.startup_command];
}
