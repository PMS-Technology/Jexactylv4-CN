<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query';
    import { Ticket } from '@lucide/svelte';
    import type { TicketStatus } from '$lib/api/definitions/account';
    import { createAdminTicket, type UserSummary } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import UserPicker from './UserPicker.svelte';
    import { STATUS_OPTIONS } from './status';

    /** New ticket, ported from NewTicketForm.tsx. */
    const queryClient = useQueryClient();

    let title = $state('');
    let owner = $state<UserSummary | null>(null);
    let assignee = $state<UserSummary | null>(null);
    let status = $state<TicketStatus>('pending');
    let saving = $state(false);
    let error = $state('');

    // Ticket::$validationRules: title 3–191, owner required.
    const valid = $derived(title.trim().length >= 3 && title.trim().length <= 191 && owner !== null);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        try {
            const ticket = await createAdminTicket({
                title: title.trim(),
                user_id: owner!.id,
                assigned_to: assignee?.id ?? null,
                status,
            });
            await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
            navigate(`/admin/tickets/${ticket.id}`);
        } catch (e) {
            error = httpErrorToHuman(e);
            saving = false;
        }
    }
</script>

<form onsubmit={submit} class="space-y-4">
    {#if error}<Alert variant="destructive">{error}</Alert>{/if}

    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><Ticket class="size-4" />工单信息</CardTitle></CardHeader>
        <CardContent class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div class="space-y-1.5">
                <Label for="ticket-title">标题</Label>
                <Input id="ticket-title" bind:value={title} maxlength={191} disabled={saving} />
                <p class="text-xs text-muted-foreground">工单的简短标题或说明，3–191 个字符。</p>
            </div>
            <div class="space-y-1.5">
                <Select
                    id="ticket-status"
                    items={STATUS_OPTIONS}
                    bind:value={status}
                    disabled={saving}
                    label="状态"
                />
                <p class="text-xs text-muted-foreground">创建前可以先设置工单状态。</p>
            </div>
            <div>
                <UserPicker id="ticket-owner" label="工单提交者" selected={owner} disabled={saving} onSelect={u => (owner = u)} />
                <p class="mt-1.5 text-xs text-muted-foreground">这张工单所属的用户，必填。</p>
            </div>
            <div>
                <UserPicker id="ticket-assignee" label="负责的管理员（可选）" selected={assignee} adminsOnly disabled={saving} onSelect={u => (assignee = u)} />
                <p class="mt-1.5 text-xs text-muted-foreground">指定一名管理员处理此工单。</p>
            </div>
        </CardContent>
    </Card>

    <div class="flex justify-end gap-2">
        <Button variant="ghost" href="/admin/tickets">取消</Button>
        <Button type="submit" loading={saving} disabled={!valid}>创建</Button>
    </div>
</form>
