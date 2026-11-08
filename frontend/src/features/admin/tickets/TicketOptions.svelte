<script lang="ts">
    import { ListOrdered } from '@lucide/svelte';
    import { updateTicketSetting } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /** Ticket module options, ported from TicketOptionsContainer.tsx and ToggleTicketsButton.tsx. */
    const canUpdate = $derived(app.can('tickets.update'));

    let maxCount = $state(String(app.flags?.tickets.maxCount ?? 3));
    // Client TicketController compares the user's count against this, so it must be a whole number.
    const valid = $derived(/^\d+$/.test(maxCount.trim()));

    let busy = $state<'save' | 'toggle' | null>(null);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || busy) return;

        busy = 'save';
        notice = null;
        try {
            const value = Number(maxCount.trim());
            await updateTicketSetting('max_count', value);
            app.updateFlags({ tickets: { ...app.flags!.tickets, maxCount: value } });
            notice = { variant: 'success', text: '设置已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            busy = null;
        }
    }

    async function disable() {
        busy = 'toggle';
        notice = null;
        try {
            await updateTicketSetting('enabled', false);
            // TicketsArea swaps to the "enable" card when the flag goes false.
            app.updateFlags({ tickets: { ...app.flags!.tickets, enabled: false } });
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
            busy = null;
        }
    }
</script>

<form onsubmit={save} class="space-y-6">
    {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}

    <div class="grid gap-6 md:grid-cols-3">
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><ListOrdered class="size-4" />工单数量上限</CardTitle></CardHeader>
            <CardContent class="space-y-1.5">
                <Input
                    bind:value={maxCount}
                    inputmode="numeric"
                    aria-label="每个用户的工单数量上限"
                    disabled={!canUpdate}
                    error={valid ? undefined : '请输入非负整数。'}
                />
                <p class="text-xs text-muted-foreground">每个用户最多可以创建的工单数量。</p>
            </CardContent>
        </Card>
    </div>

    <div class="flex items-center justify-between gap-4">
        <p class="text-xs text-muted-foreground">用户刷新页面后改动才会生效。</p>
        {#if canUpdate}
            <div class="flex gap-2">
                <Button type="button" variant="destructive" loading={busy === 'toggle'} disabled={busy !== null} onclick={disable}>停用工单</Button>
                <Button type="submit" loading={busy === 'save'} disabled={!valid || busy !== null}>保存更改</Button>
            </div>
        {/if}
    </div>
</form>
