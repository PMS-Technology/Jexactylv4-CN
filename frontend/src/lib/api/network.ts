import http from '$lib/api/http';
import { toAllocation } from '$lib/api/transformers/server';
import type { Allocation } from '$lib/api/definitions/server';

/** Allocation endpoints under `/api/client/servers/:id/network`, ported from `api/routes/server/allocations.ts`. */

export async function getAllocations(uuid: string): Promise<Allocation[]> {
    const { data } = await http.get(`/api/client/servers/${uuid}/network/allocations`);

    return (data.data ?? []).map(toAllocation);
}

export async function createAllocation(uuid: string): Promise<Allocation> {
    const { data } = await http.post(`/api/client/servers/${uuid}/network/allocations`);

    return toAllocation(data);
}

export async function setPrimaryAllocation(uuid: string, id: number): Promise<Allocation> {
    const { data } = await http.post(`/api/client/servers/${uuid}/network/allocations/${id}/primary`);

    return toAllocation(data);
}

export async function setAllocationNotes(uuid: string, id: number, notes: string | null): Promise<Allocation> {
    const { data } = await http.post(`/api/client/servers/${uuid}/network/allocations/${id}`, { notes });

    return toAllocation(data);
}

export async function deleteAllocation(uuid: string, id: number): Promise<void> {
    await http.delete(`/api/client/servers/${uuid}/network/allocations/${id}`);
}
