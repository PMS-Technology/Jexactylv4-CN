<script lang="ts">
    import { rotateDatabasePassword } from '$lib/api/databases';
    import { httpErrorToHuman } from '$lib/api/http';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import type { Database } from '$lib/api/definitions/server';
    import { Button } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    /** Ported from RotatePasswordButton.tsx. */
    let { databaseId, store, onUpdate }: { databaseId: string; store: ServerStore; onUpdate: (database: Database) => void } =
        $props();

    let loading = $state(false);
    let error = $state('');

    async function rotate() {
        if (loading) return;

        loading = true;
        error = '';

        try {
            onUpdate(await rotateDatabasePassword(store.server!.uuid, databaseId));
        } catch (e) {
            error = httpErrorToHuman(e);
            console.error(e);
        } finally {
            loading = false;
        }
    }
</script>

<div class="space-y-2">
    {#if error}
        <Alert variant="destructive">{error}</Alert>
    {/if}
    <Button variant="outline" size="sm" disabled={loading} loading={loading} onclick={rotate}>
        轮换密码
    </Button>
</div>
