<script lang="ts">
    import { z } from 'zod';
    import { useQueryClient } from '@tanstack/svelte-query';
    import type { Database } from '$lib/api/definitions/server';
    import { createDatabase } from '$lib/api/databases';
    import type { ServerStore } from '$lib/stores/server.svelte';
    import { Button, Dialog, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import { Form } from '$lib/forms/form.svelte';

    interface Props {
        store: ServerStore;
    }

    let { store }: Props = $props();

    /** Ported from CreateDatabaseButton.tsx. */
    const queryClient = useQueryClient();

    let open = $state(false);

    const schema = z.object({
        databaseName: z
            .string()
            .min(3, '数据库名称至少需 3 个字符。')
            .max(48, '数据库名称不能超过 48 个字符。')
            .regex(
                /^[\w\-.]{3,48}$/,
                '数据库名称只能包含字母、数字、下划线、破折号和/或点。',
            ),
        connectionsFrom: z
            .string()
            .regex(/^[\w\-/.%:]*$/, '必须提供有效的主机地址。')
            .optional()
            .default('%'),
    });

    const form = new Form({
        schema,
        initial: {
            databaseName: '',
            connectionsFrom: '',
        },
        onSubmit: async (values) => {
            const database = await createDatabase(store.server!.uuid, {
                databaseName: values.databaseName,
                connectionsFrom: values.connectionsFrom || '%',
            });
            queryClient.setQueryData<Database[]>(['server', store.server!.id, 'databases'], list =>
                (list ?? []).concat(database),
            );
            form.reset();
            open = false;
        },
    });

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            form.reset();
        }
        open = nextOpen;
    }
</script>

<Dialog
    {open}
    onOpenChange={handleOpenChange}
    title="创建新数据库"
    preventClose={form.submitting}
>
    <form id="database-create-form" class="space-y-4" onsubmit={(e) => form.submit(e)} novalidate>
        {#if form.errors._}
            <Alert variant="destructive">{form.errors._}</Alert>
        {/if}

        <div>
            <Label for="database-name">数据库名称</Label>
            <Input
                id="database-name"
                type="text"
                placeholder="为您的数据库实例指定一个描述性名称。"
                bind:value={form.values.databaseName}
                disabled={form.submitting}
                aria-invalid={!!form.errors.databaseName}
            />
            {#if form.errors.databaseName}
                <p class="mt-1 text-sm text-destructive">{form.errors.databaseName}</p>
            {/if}
        </div>

        <div>
            <Label for="connections-from">允许连接来自</Label>
            <Input
                id="connections-from"
                type="text"
                placeholder="留空则允许来自任何地方的连接。"
                bind:value={form.values.connectionsFrom}
                disabled={form.submitting}
                aria-invalid={!!form.errors.connectionsFrom}
            />
            {#if form.errors.connectionsFrom}
                <p class="mt-1 text-sm text-destructive">{form.errors.connectionsFrom}</p>
            {/if}
        </div>
    </form>

    {#snippet footer()}
        <Button
            variant="ghost"
            size="sm"
            disabled={form.submitting}
            onclick={() => (open = false)}
        >
            取消
        </Button>
        <Button
            type="submit"
            form="database-create-form"
            size="sm"
            loading={form.submitting}
            disabled={form.submitting}
        >
            创建数据库
        </Button>
    {/snippet}
</Dialog>

<Button onclick={() => (open = true)}>新建数据库</Button>
