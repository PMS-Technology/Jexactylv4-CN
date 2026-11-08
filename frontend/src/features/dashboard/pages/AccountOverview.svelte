<script lang="ts">
    import { app } from '$lib/stores/app.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import UpdateAvatarForm from '../components/UpdateAvatarForm.svelte';
    import UpdateEmailForm from '../components/UpdateEmailForm.svelte';
    import UpdatePasswordForm from '../components/UpdatePasswordForm.svelte';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/ui';

    const user = $derived(app.user);
</script>

<div class="mx-auto max-w-5xl p-6 lg:p-8">
    <PageHeader title="账号" description="管理你的登录信息。" />

    <div class="space-y-4">
        <Card>
            <CardHeader>
                <CardTitle>头像</CardTitle>
                <CardDescription>上传图片或填写链接，移除后恢复默认生成头像。</CardDescription>
            </CardHeader>
            <CardContent>
                <UpdateAvatarForm />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>账号信息</CardTitle>
                <CardDescription>这些信息由管理员或注册时设置。</CardDescription>
            </CardHeader>
            <CardContent>
                <dl class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <dt class="text-xs text-muted-foreground">用户名</dt>
                        <dd class="mt-0.5 font-mono text-sm">{user?.username}</dd>
                    </div>
                    <div>
                        <dt class="text-xs text-muted-foreground">角色</dt>
                        <dd class="mt-0.5 text-sm">{user?.roleName || '普通用户'}</dd>
                    </div>
                    <div>
                        <dt class="text-xs text-muted-foreground">两步验证</dt>
                        <dd class="mt-0.5 text-sm">{user?.useTotp ? '已启用' : '未启用'}</dd>
                    </div>
                    <div>
                        <dt class="text-xs text-muted-foreground">注册时间</dt>
                        <dd class="mt-0.5 text-sm">
                            {user?.createdAt.toLocaleDateString()}
                        </dd>
                    </div>
                </dl>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>邮箱地址</CardTitle>
                <CardDescription>修改邮箱需要输入当前密码。</CardDescription>
            </CardHeader>
            <CardContent>
                <UpdateEmailForm />
            </CardContent>
        </Card>

        {#if user?.hasPassword}
            <Card>
                <CardHeader>
                    <CardTitle>密码</CardTitle>
                    <CardDescription>密码长度至少 8 位。</CardDescription>
                </CardHeader>
                <CardContent>
                    <UpdatePasswordForm />
                </CardContent>
            </Card>
        {:else}
            <!-- SSO-only accounts have no password to change; the backend rejects the request. -->
            <Card>
                <CardHeader>
                    <CardTitle>密码</CardTitle>
                    <CardDescription>
                        你的账号通过第三方登录创建，没有设置密码。
                    </CardDescription>
                </CardHeader>
            </Card>
        {/if}
    </div>
</div>
