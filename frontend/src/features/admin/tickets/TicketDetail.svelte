<script lang="ts">
    import { createQuery, keepPreviousData, useQueryClient } from '@tanstack/svelte-query';
    import { differenceInHours, format, formatDistanceToNow } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { Settings2, Trash2 } from '@lucide/svelte';
    import type { TicketStatus } from '$lib/api/definitions/account';
    import {
        createAdminTicketMessage,
        deleteAdminTicket,
        getAdminTicket,
        getAdminTicketMessages,
        updateAdminTicket,
        type UserSummary,
    } from '$lib/api/admin/modules';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle, Select, Spinner } from '$lib/ui';
    import Textarea from '$lib/ui/Textarea.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import Avatar from '$lib/components/Avatar.svelte';
    import Link from '$lib/components/Link.svelte';
    import Pagination from '$lib/components/Pagination.svelte';
    import TicketStatusBadge from '$features/dashboard/tickets/TicketStatusBadge.svelte';
    import UserPicker from './UserPicker.svelte';
    import { STATUS_OPTIONS } from './status';

    /**
     * Ticket detail, ported from ViewTicketContainer.tsx, MessageTable.tsx,
     * NewMessageDialog.tsx and DeleteTicketDialog.tsx. Messages show in full, newest
     * first, with the reply box above them; the legacy page truncated each to 64
     * characters behind a "Read Message" dialog and reloaded the document after a reply.
     */
    let { id }: { id: number } = $props();

    const queryClient = useQueryClient();
    const canUpdate = $derived(app.can('tickets.update'));

    const ticket = createQuery(() => ({
        queryKey: ['admin', 'tickets', 'detail', id],
        queryFn: () => getAdminTicket(id),
    }));

    // --- Options form, seeded once the ticket has loaded.
    let status = $state<TicketStatus>('pending');
    let owner = $state<UserSummary | null>(null);
    let assignee = $state<UserSummary | null>(null);
    let seeded = false;

    $effect(() => {
        const t = ticket.data;
        if (!t || seeded) return;
        seeded = true;
        status = t.status;
        owner = t.user;
        assignee = t.assignedTo;
    });

    let saving = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function save(event: SubmitEvent) {
        event.preventDefault();
        const t = ticket.data;
        if (!t || !owner || saving) return;

        saving = true;
        notice = null;
        try {
            const updated = await updateAdminTicket(t.id, {
                title: t.title,
                user_id: owner.id,
                assigned_to: assignee?.id ?? null,
                status,
            });
            queryClient.setQueryData(['admin', 'tickets', 'detail', id], updated);
            await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'], exact: false });
            notice = { variant: 'success', text: '工单已更新。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }

    let deleteOpen = $state(false);

    async function remove() {
        await deleteAdminTicket(id);
        // Drop this ticket's queries rather than invalidating them: they are still
        // mounted, and a refetch of a deleted ticket only produces 404s.
        queryClient.removeQueries({ queryKey: ['admin', 'tickets', 'detail', id] });
        queryClient.removeQueries({ queryKey: ['admin', 'tickets', 'messages', id] });
        navigate('/admin/tickets');
        await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    }

    // --- Messages.
    let page = $state(1);
    const messages = createQuery(() => ({
        queryKey: ['admin', 'tickets', 'messages', id, page],
        queryFn: () => getAdminTicketMessages(id, page),
        placeholderData: keepPreviousData,
    }));

    let reply = $state('');
    let sending = $state(false);
    let replyError = $state('');
    // TicketMessage::$validationRules: 3–500 characters.
    const replyValid = $derived(reply.trim().length >= 3 && reply.trim().length <= 500);

    async function send(event: SubmitEvent) {
        event.preventDefault();
        if (!replyValid || sending) return;

        sending = true;
        replyError = '';
        try {
            await createAdminTicketMessage(id, reply.trim());
            reply = '';
            page = 1;
            await queryClient.invalidateQueries({ queryKey: ['admin', 'tickets', 'messages', id] });
        } catch (e) {
            replyError = httpErrorToHuman(e);
        } finally {
            sending = false;
        }
    }

    const when = (date: Date) =>
        Math.abs(differenceInHours(date, new Date())) > 48
            ? format(date, 'yyyy-MM-dd HH:mm')
            : formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
</script>

{#if ticket.error}
    <Alert variant="destructive">{httpErrorToHuman(ticket.error)}</Alert>
{:else if !ticket.data}
    <Spinner centered />
{:else}
    {@const t = ticket.data}
    <div class="space-y-6">
        <div>
            <h2 class="flex flex-wrap items-center gap-2 font-header text-lg font-semibold">
                {t.title}
                <TicketStatusBadge status={t.status} />
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">创建于 {when(t.createdAt)}</p>
        </div>

        {#if !t.user}
            <Alert variant="destructive" title="工单没有所属用户">
                这张工单的提交者账号已不存在，只能删除。
            </Alert>
        {/if}

        {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}

        <form onsubmit={save}>
            <Card>
                <CardHeader><CardTitle class="flex items-center gap-2"><Settings2 class="size-4" />工单选项</CardTitle></CardHeader>
                <CardContent class="space-y-4">
                    <!-- grid-cols-1 caps the track at the card width; an implicit track grew to
                         fit the picker's email and pushed the fields out of the card on mobile. -->
                    <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <div class="space-y-1.5">
                            <Select
                                id="detail-status"
                                items={STATUS_OPTIONS}
                                bind:value={status}
                                disabled={!canUpdate || saving}
                                label="状态"
                            />
                            <p class="text-xs text-muted-foreground">修改用户看到的工单状态。</p>
                        </div>
                        <div>
                            <UserPicker
                                id="detail-assignee"
                                label="负责的管理员"
                                selected={assignee}
                                adminsOnly
                                disabled={!canUpdate || saving}
                                onSelect={u => (assignee = u)}
                            />
                            <p class="mt-1.5 text-xs text-muted-foreground">清除即取消分配。</p>
                        </div>
                        <div>
                            <UserPicker
                                id="detail-owner"
                                label="工单提交者"
                                selected={owner}
                                disabled={!canUpdate || saving}
                                onSelect={u => (owner = u)}
                            />
                            <p class="mt-1.5 text-xs text-muted-foreground">需要时可以把工单转给其他用户。</p>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2">
                        {#if app.can('tickets.delete')}
                            <Button type="button" variant="destructive" onclick={() => (deleteOpen = true)}><Trash2 />删除工单</Button>
                        {/if}
                        {#if canUpdate}
                            <Button type="submit" loading={saving} disabled={!owner}>保存更改</Button>
                        {/if}
                    </div>
                </CardContent>
            </Card>
        </form>

        <section class="space-y-4">
            <h3 class="font-header text-base font-semibold">工单消息</h3>

            {#if app.can('tickets.message')}
                <form onsubmit={send} class="space-y-2">
                    {#if replyError}<Alert variant="destructive">{replyError}</Alert>{/if}
                    <Textarea bind:value={reply} rows={4} maxlength={500} placeholder="以管理员身份回复，3–500 个字符" aria-label="回复内容" disabled={sending} />
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-muted-foreground">{reply.trim().length} / 500</span>
                        <Button type="submit" size="sm" loading={sending} disabled={!replyValid}>发送</Button>
                    </div>
                </form>
            {/if}

            {#if messages.error}
                <Alert variant="destructive">{httpErrorToHuman(messages.error)}</Alert>
            {:else if !messages.data}
                <Spinner centered />
            {:else if !messages.data.items.length}
                <p class="py-8 text-center text-sm text-muted-foreground">还没有消息。</p>
            {:else}
                <ul class="space-y-3">
                    {#each messages.data.items as message (message.id)}
                        <li class="rounded-lg border border-border bg-card p-4">
                            <div class="flex flex-wrap items-center gap-2 text-sm">
                                <Avatar src={message.author?.avatarUrl} name={message.author?.uuid ?? 'deleted'} size={24} />
                                {#if message.author}
                                    <Link href="/admin/users/{message.author.id}" class="font-medium text-primary hover:underline">{message.author.email}</Link>
                                    {#if message.author.id !== t.user?.id}
                                        <span class="rounded-full bg-muted px-1.5 py-0.5 text-2xs">管理员</span>
                                    {/if}
                                {:else}
                                    <span class="font-medium text-muted-foreground">已删除的用户</span>
                                {/if}
                                <span class="ml-auto text-xs text-muted-foreground">#{message.id} · {when(message.createdAt)}</span>
                            </div>
                            <p class="mt-2 text-sm break-words whitespace-pre-wrap">{message.message}</p>
                        </li>
                    {/each}
                </ul>
                <Pagination pagination={messages.data.pagination} currentPage={page} onPageChange={p => (page = p)} />
            {/if}
        </section>
    </div>

    <ConfirmDialog bind:open={deleteOpen} title="确认删除工单" confirmLabel="删除" onConfirm={remove}>
        <p>确定删除工单 <strong>{t.title}</strong> 及其全部消息吗？此操作无法撤销。</p>
    </ConfirmDialog>
{/if}
