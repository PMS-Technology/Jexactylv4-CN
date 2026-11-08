<script lang="ts">
    import { app } from '$lib/stores/app.svelte';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/ui';
    import UpdateEmailForm from '../components/UpdateEmailForm.svelte';
    import UpdatePasswordForm from '../components/UpdatePasswordForm.svelte';
    import TwoFactorCard from './components/TwoFactorCard.svelte';
</script>

<div class="grid gap-4 lg:grid-cols-2">
    <TwoFactorCard />

    <Card>
        <CardHeader>
            <CardTitle>邮箱地址</CardTitle>
            <CardDescription>修改邮箱需要输入当前密码。</CardDescription>
        </CardHeader>
        <CardContent>
            <UpdateEmailForm />
        </CardContent>
    </Card>

    {#if app.user?.hasPassword}
        <Card>
            <CardHeader>
                <CardTitle>密码</CardTitle>
                <CardDescription>密码长度至少 8 位。</CardDescription>
            </CardHeader>
            <CardContent>
                <UpdatePasswordForm />
            </CardContent>
        </Card>
    {/if}
</div>
