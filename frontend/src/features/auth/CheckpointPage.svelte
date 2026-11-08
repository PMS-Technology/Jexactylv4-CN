<script lang="ts">
    import { z } from 'zod';
    import { checkpoint } from '$lib/api/auth';
    import { Form } from '$lib/forms/form.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import { Button, Input, Label } from '$lib/ui';
    import Alert from '$lib/components/Alert.svelte';
    import Link from '$lib/components/Link.svelte';
    import AuthLayout from './AuthLayout.svelte';
    import { afterLogin, authState } from './state.svelte';

    /**
     * Two-factor step, ported from LoginCheckpointContainer.tsx. The token comes from the
     * password login, or from `?token=` when an SSO login redirects here. The token is valid
     * for five minutes.
     */
    const token = authState.checkpointToken || router.query.get('token') || '';
    // In an effect: navigating while this component is still being created updated the URL
    // but left this page on screen.
    $effect(() => {
        if (!token) navigate('/auth/login', { replace: true });
    });

    let recovery = $state(false);

    const form = new Form({
        schema: z.object({ code: z.string().trim().min(1, '请输入验证码。') }),
        initial: { code: '' },
        onSubmit: async ({ code }) => {
            const response = await checkpoint(token, recovery ? '' : code, recovery ? code : undefined);
            if (response.complete) window.location.assign(afterLogin(response.intended));
        },
    });
</script>

{#if token}
<AuthLayout title="两步验证" description={recovery ? '输入启用两步验证时保存的一个恢复码。每个恢复码只能用一次。' : '输入身份验证器应用里显示的 6 位验证码。'}>
    <form class="space-y-4" onsubmit={e => form.submit(e)} novalidate>
        {#if form.errors._}<Alert variant="destructive">{form.errors._}</Alert>{/if}
        <div class="space-y-1.5">
            <Label for="checkpoint-code">{recovery ? '恢复码' : '验证码'}</Label>
            <!-- svelte-ignore a11y_autofocus -->
            <Input
                id="checkpoint-code"
                autocomplete="one-time-code"
                inputmode={recovery ? 'text' : 'numeric'}
                class="font-mono tracking-widest"
                autofocus
                bind:value={form.values.code}
                error={form.errors.code}
                disabled={form.submitting}
                oninput={() => form.clearError('code')}
            />
        </div>
        <Button type="submit" class="w-full" loading={form.submitting}>继续</Button>
    </form>
    <div class="mt-4 flex justify-center gap-3 text-xs text-muted-foreground">
        <button type="button" class="hover:text-foreground" onclick={() => ((recovery = !recovery), form.reset())}>{recovery ? '使用验证码' : '设备丢失？使用恢复码'}</button>
        <span>·</span>
        <Link href="/auth/login" class="hover:text-foreground">返回登录</Link>
    </div>
</AuthLayout>
{/if}
