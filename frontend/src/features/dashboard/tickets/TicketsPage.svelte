<script lang="ts">
    import { z } from 'zod';
    import { createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { formatDistanceToNow } from 'date-fns';
    import { zhCN } from 'date-fns/locale';
    import { ChevronRight } from '@lucide/svelte';
    import { createTicket, getTickets, ticketKeys } from '$lib/api/tickets';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { navigate } from '$lib/router/router.svelte';
    import { Form } from '$lib/forms/form.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Spinner, Textarea } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import TicketStatusBadge from './TicketStatusBadge.svelte';

    const queryClient = useQueryClient();
    const ticketsQuery = createQuery(() => ({
        queryKey: ticketKeys.all,
        queryFn: getTickets,
    }));

    // An env-provided limit reaches the page as a string; the backend casts it with (int).
    const maxCount = $derived(Number(app.flags?.tickets.maxCount ?? 0));
    const count = $derived(ticketsQuery.data?.length ?? 0);
    // The backend counts every ticket the user owns, resolved ones included.
    const atLimit = $derived(Boolean(ticketsQuery.data) && count >= maxCount);

    // Limits follow StoreTicketRequest (title ≤ 191, message 1–4000).
    const schema = z.object({
        title: z.string().trim().min(1, '请填写工单标题。').max(191, '标题最多 191 个字符。'),
        message: z.string().trim().min(1, '请填写问题描述。').max(4000, '内容最多 4000 个字符。'),
    });

    const form = new Form({
        schema,
        initial: { title: '', message: '' },
        onSubmit: async values => {
            const ticket = await createTicket(values.title, values.message);
            await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
            navigate(`/account/tickets/${ticket.id}`);
        },
    });
</script>

<svelte:head>
    <title>工单 | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-6 lg:p-8">
    <PageHeader title="工单" description="创建工单以获得管理员的支持。" />

    <div class="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card class="self-start">
            <CardHeader>
                <CardTitle>我的工单</CardTitle>
                {#if ticketsQuery.data}
                    <CardDescription>已创建 {count} / {maxCount} 个</CardDescription>
                {/if}
            </CardHeader>
            <CardContent>
                {#if ticketsQuery.error}
                    <Alert variant="destructive">{httpErrorToHuman(ticketsQuery.error)}</Alert>
                {:else if ticketsQuery.isPending}
                    <Spinner centered />
                {:else if !ticketsQuery.data.length}
                    <p class="py-8 text-center text-sm text-muted-foreground">你还没有创建过工单。</p>
                {:else}
                    <ul class="-mx-2 divide-y divide-border">
                        {#each ticketsQuery.data as ticket (ticket.id)}
                            <li>
                                <Link
                                    href="/account/tickets/{ticket.id}"
                                    class="flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent"
                                >
                                    <span class="shrink-0 font-mono text-sm text-muted-foreground">#{ticket.id}</span>
                                    <div class="min-w-0 flex-1">
                                        <p class="truncate text-sm font-medium">{ticket.title}</p>
                                        <p
                                            class="mt-0.5 text-xs text-muted-foreground"
                                            title={formatDateTime(ticket.createdAt)}
                                        >
                                            创建于 {formatDistanceToNow(ticket.createdAt, { addSuffix: true, locale: zhCN })}
                                        </p>
                                    </div>
                                    <TicketStatusBadge status={ticket.status} />
                                    <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
                                </Link>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </CardContent>
        </Card>

        <Card class="self-start">
            <CardHeader><CardTitle>创建工单</CardTitle></CardHeader>
            <CardContent>
                {#if atLimit}
                    <Alert variant="warning">
                        你已达到每个账号最多 {maxCount} 个工单的上限。删除不再需要的工单后可以继续创建。
                    </Alert>
                {:else}
                    <form onsubmit={e => form.submit(e)} class="space-y-4" novalidate>
                        {#if form.errors._}
                            <Alert variant="destructive">{form.errors._}</Alert>
                        {/if}
                        <div>
                            <Label for="ticket-title">标题</Label>
                            <Input
                                id="ticket-title"
                                bind:value={form.values.title}
                                error={form.errors.title}
                                oninput={() => form.clearError('title')}
                                maxlength={191}
                            />
                        </div>
                        <div>
                            <Label for="ticket-message">问题描述</Label>
                            <Textarea
                                id="ticket-message"
                                bind:value={form.values.message}
                                error={form.errors.message}
                                oninput={() => form.clearError('message')}
                                class="h-32"
                                maxlength={4000}
                            />
                        </div>
                        <div class="flex justify-end">
                            <Button type="submit" size="sm" loading={form.submitting}>提交工单</Button>
                        </div>
                    </form>
                {/if}
            </CardContent>
        </Card>
    </div>
</div>
