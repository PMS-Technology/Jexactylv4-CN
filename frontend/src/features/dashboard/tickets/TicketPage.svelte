<script lang="ts">
    import { z } from 'zod';
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { formatDistanceToNow } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ArrowLeft, Trash2 } from '@lucide/svelte';
    import { addTicketMessage, deleteTicket, getTicket, ticketKeys } from '$lib/api/tickets';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Form } from '$lib/forms/form.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { cn } from '$lib/utils/cn';
    import { Button, Card, CardContent, CardHeader, CardTitle, ConfirmDialog, Label, Spinner, Textarea } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import TicketStatusBadge from './TicketStatusBadge.svelte';

    let { params }: { params: { id: string } } = $props();

    const id = $derived(/^\d+$/.test(params.id) ? Number(params.id) : null);

    const queryClient = useQueryClient();
    const ticketQuery = createQuery(() => ({
        queryKey: ticketKeys.detail(id ?? 0),
        queryFn: () => getTicket(id!),
        enabled: id !== null,
    }));

    const ticket = $derived(ticketQuery.data);
    // Newest first, as the legacy page showed it.
    const messages = $derived(ticket?.messages ? [...ticket.messages].reverse() : []);

    const form = new Form({
        schema: z.object({
            message: z.string().trim().min(1, '请填写回复内容。').max(4000, '内容最多 4000 个字符。'),
        }),
        initial: { message: '' },
        onSubmit: async values => {
            await addTicketMessage(id!, values.message);
            await queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id!) });
            form.reset();
        },
    });

    let deleteOpen = $state(false);

    async function confirmDelete() {
        await deleteTicket(id!);
        queryClient.removeQueries({ queryKey: ticketKeys.detail(id!) });
        await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
        navigate('/account/tickets');
    }

    /** Messages written by anyone other than the ticket owner come from staff. */
    const isOwn = (author: { uuid: string } | null) => author?.uuid === app.user?.uuid;
</script>

<svelte:head>
    <title>{ticket ? `#${ticket.id} ${ticket.title}` : '工单'} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

{#if id === null}
    <NotFound backTo="/account/tickets" />
{:else}
    <div class="mx-auto max-w-5xl p-6 lg:p-8">
        <Button href="/account/tickets" variant="ghost" size="sm" class="-ml-3 mb-4">
            <ArrowLeft />
            返回工单列表
        </Button>

        {#if ticketQuery.error}
            <Alert variant="destructive">{httpErrorToHuman(ticketQuery.error)}</Alert>
        {:else if !ticket}
            <Spinner centered />
        {:else}
            <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div class="min-w-0 space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                        <h1 class="break-words font-header text-xl font-semibold tracking-tight">{ticket.title}</h1>
                        <TicketStatusBadge status={ticket.status} />
                    </div>
                    <p class="text-sm text-muted-foreground">
                        #{ticket.id} · 创建于 {formatDateTime(ticket.createdAt)}
                    </p>
                </div>
                <Button variant="outline" size="sm" onclick={() => (deleteOpen = true)}>
                    <Trash2 />
                    删除工单
                </Button>
            </header>

            <div class="grid gap-4 lg:grid-cols-[3fr_2fr]">
                <Card class="self-start">
                    <CardHeader><CardTitle>消息</CardTitle></CardHeader>
                    <CardContent>
                        {#if !messages.length}
                            <p class="py-8 text-center text-sm text-muted-foreground">这个工单还没有消息。</p>
                        {:else}
                            <ol class="space-y-4">
                                {#each messages as message (message.id)}
                                    {@const own = isOwn(message.author)}
                                    <li>
                                        <div
                                            class={cn(
                                                'rounded-lg border p-3 text-sm',
                                                own ? 'border-border bg-muted/40' : 'border-primary/30 bg-primary/5',
                                            )}
                                        >
                                            <p class="mb-1 text-xs font-medium text-muted-foreground">
                                                {own ? '你' : '客服（管理员）'}
                                            </p>
                                            <p class="whitespace-pre-wrap break-words">{message.message}</p>
                                        </div>
                                        <p
                                            class="mt-1 text-right text-xs text-muted-foreground"
                                            title={formatDateTime(message.createdAt)}
                                        >
                                            {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: zhCN })}
                                        </p>
                                    </li>
                                {/each}
                            </ol>
                            <p class="mt-4 text-xs text-muted-foreground">按时间倒序，最新消息在最上方。</p>
                        {/if}
                    </CardContent>
                </Card>

                <Card class="self-start">
                    <CardHeader><CardTitle>回复</CardTitle></CardHeader>
                    <CardContent>
                        <form onsubmit={e => form.submit(e)} class="space-y-4" novalidate>
                            {#if form.errors._}
                                <Alert variant="destructive">{form.errors._}</Alert>
                            {/if}
                            <div>
                                <Label for="ticket-reply">内容</Label>
                                <Textarea
                                    id="ticket-reply"
                                    bind:value={form.values.message}
                                    error={form.errors.message}
                                    oninput={() => form.clearError('message')}
                                    class="h-32"
                                    maxlength={4000}
                                />
                            </div>
                            <div class="flex justify-end">
                                <Button type="submit" size="sm" loading={form.submitting}>发送回复</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        {/if}
    </div>

    <ConfirmDialog bind:open={deleteOpen} title="删除工单" confirmLabel="删除工单" onConfirm={confirmDelete}>
        <p>确定要删除这个工单及其所有消息吗？此操作无法撤销。</p>
    </ConfirmDialog>
{/if}
