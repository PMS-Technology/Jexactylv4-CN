<script lang="ts">
    import { z } from 'zod';
    import { Form } from '$lib/forms/form.svelte';
    import { updateAccountEmail } from '$lib/api/account';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';

    const schema = z.object({
        email: z.string().min(1, '请输入邮箱地址。').email('邮箱地址格式不正确。'),
        password: z.string().min(1, '请输入当前密码以确认修改。'),
    });

    const form = new Form({
        schema,
        initial: { email: app.user?.email ?? '', password: '' },
        onSubmit: async values => {
            await updateAccountEmail(values.email, values.password);
            // Keep the local user in step so the sidebar reflects the new address.
            app.updateUser({ email: values.email });
            form.values.password = '';
        },
    });
</script>

<form onsubmit={e => form.submit(e)} class="space-y-4" novalidate>
    {#if form.errors._}
        <Alert variant="destructive">{form.errors._}</Alert>
    {:else if form.succeeded}
        <Alert variant="success">邮箱地址已更新。</Alert>
    {/if}

    <div>
        <Label for="email">邮箱地址</Label>
        <Input
            id="email"
            type="email"
            autocomplete="email"
            bind:value={form.values.email}
            error={form.errors.email}
            oninput={() => form.clearError('email')}
        />
    </div>

    <div>
        <Label for="email-password">当前密码</Label>
        <Input
            id="email-password"
            type="password"
            autocomplete="current-password"
            bind:value={form.values.password}
            error={form.errors.password}
            oninput={() => form.clearError('password')}
        />
    </div>

    <Button type="submit" size="sm" loading={form.submitting}>更新邮箱</Button>
</form>
