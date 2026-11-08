<script lang="ts">
    import { z } from 'zod';
    import { Form } from '$lib/forms/form.svelte';
    import { updateAccountPassword } from '$lib/api/account';
    import { Button, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    const schema = z
        .object({
            current: z.string().min(1, '请输入当前密码。'),
            password: z.string().min(8, '新密码长度至少为 8 位。'),
            confirmPassword: z.string().min(1, '请再次输入新密码。'),
        })
        .refine(data => data.password === data.confirmPassword, {
            message: '两次输入的密码不一致。',
            path: ['confirmPassword'],
        });

    const form = new Form({
        schema,
        initial: { current: '', password: '', confirmPassword: '' },
        onSubmit: async values => {
            await updateAccountPassword(values);
            // Laravel rotates the session on a password change, so clear the fields.
            form.reset();
            form.succeeded = true;
        },
    });
</script>

<form onsubmit={e => form.submit(e)} class="space-y-4" novalidate>
    {#if form.errors._}
        <Alert variant="destructive">{form.errors._}</Alert>
    {:else if form.succeeded}
        <Alert variant="success">密码已更新。</Alert>
    {/if}

    <div>
        <Label for="current-password">当前密码</Label>
        <Input
            id="current-password"
            type="password"
            autocomplete="current-password"
            bind:value={form.values.current}
            error={form.errors.current}
            oninput={() => form.clearError('current')}
        />
    </div>

    <div>
        <Label for="new-password">新密码</Label>
        <Input
            id="new-password"
            type="password"
            autocomplete="new-password"
            bind:value={form.values.password}
            error={form.errors.password}
            oninput={() => form.clearError('password')}
        />
    </div>

    <div>
        <Label for="confirm-password">确认新密码</Label>
        <Input
            id="confirm-password"
            type="password"
            autocomplete="new-password"
            bind:value={form.values.confirmPassword}
            error={form.errors.confirmPassword}
            oninput={() => form.clearError('confirmPassword')}
        />
    </div>

    <Button type="submit" size="sm" loading={form.submitting}>更新密码</Button>
</form>
