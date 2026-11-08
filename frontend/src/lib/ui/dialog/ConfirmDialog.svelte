<script lang="ts">
    import type { Snippet } from 'svelte';
    import Dialog from './Dialog.svelte';
    import Button from '$lib/ui/button/Button.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { httpErrorToHuman } from '$lib/api/http';

    type Props = {
        open?: boolean;
        title: string;
        confirmLabel?: string;
        /** Runs on confirm. The dialog stays open with the error shown if it throws. */
        onConfirm: () => Promise<void> | void;
        /** Disables the confirm button, e.g. until a required field is filled. */
        disabled?: boolean;
        children?: Snippet;
    };

    let { open = $bindable(false), title, confirmLabel = '确认', onConfirm, disabled = false, children }: Props =
        $props();

    let busy = $state(false);
    let error = $state('');

    async function confirm() {
        busy = true;
        error = '';
        try {
            await onConfirm();
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            busy = false;
        }
    }
</script>

<Dialog bind:open {title} preventClose={busy} onOpenChange={o => o || (error = '')}>
    <div class="space-y-4 text-sm">
        {#if error}
            <Alert variant="destructive">{error}</Alert>
        {/if}
        {@render children?.()}
    </div>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={busy} onclick={() => (open = false)}>取消</Button>
        <Button variant="destructive" size="sm" loading={busy} {disabled} onclick={confirm}>{confirmLabel}</Button>
    {/snippet}
</Dialog>
