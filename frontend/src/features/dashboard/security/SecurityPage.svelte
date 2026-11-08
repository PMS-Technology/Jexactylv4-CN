<script lang="ts">
    import type { Component } from 'svelte';
    import { Code, Fingerprint, Lock, Terminal } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import Link from '$lib/components/Link.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import CredentialsTab from './CredentialsTab.svelte';
    import PasskeysTab from './PasskeysTab.svelte';
    import SSHKeysTab from './SSHKeysTab.svelte';
    import ApiKeysTab from './ApiKeysTab.svelte';

    /** Remainder of the path after `/account/security`, supplied by the account router. */
    let { rest = '' }: { rest?: string } = $props();

    /** Ported from `account/security/SecurityRouter.tsx`; one table drives tabs and content. */
    const tabs: { path: string; name: string; description: string; icon: Component<any>; component: Component<any> }[] =
        [
            {
                path: '',
                name: '凭据',
                description: '修改账号的邮箱、密码和两步验证。',
                icon: Lock,
                component: CredentialsTab,
            },
            {
                path: 'passkeys',
                name: 'Passkey',
                description: '用指纹、面容或安全密钥代替密码登录。',
                icon: Fingerprint,
                component: PasskeysTab,
            },
            {
                path: 'ssh',
                name: 'SSH 密钥',
                description: '添加或删除用于访问服务器 SFTP 的 SSH 密钥。',
                icon: Terminal,
                component: SSHKeysTab,
            },
            {
                path: 'api',
                name: 'API 密钥',
                description: '创建或删除用于访问面板 API 的密钥。',
                icon: Code,
                component: ApiKeysTab,
            },
        ];

    const active = $derived(tabs.find(tab => tab.path === rest.replace(/\/+$/, '')));

    // The 2FA middleware redirects here when the panel forces two-factor and the account has
    // not enrolled. A passkey session also satisfies it, which the client cannot see, so this
    // notice can show for such a session too; it is informational only.
    const twoFactorRequired = $derived(Boolean(app.flags?.auth.security.force2fa && !app.user?.useTotp));
</script>

<svelte:head>
    <title>{active?.name ?? '安全'} | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-5xl p-6 lg:p-8">
    <PageHeader title="安全" description={active?.description} />

    {#if twoFactorRequired}
        <Alert variant="warning" title="需要两步验证" class="mb-6">
            此面板要求账号启用两步验证后才能继续使用。
        </Alert>
    {/if}

    <nav class="mb-6 flex gap-1 overflow-x-auto border-b border-border scrollbar-thin" aria-label="安全">
        {#each tabs as tab (tab.path)}
            {@const Icon = tab.icon}
            <Link
                href={tab.path ? `/account/security/${tab.path}` : '/account/security'}
                end
                class="-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeClass="border-foreground font-medium text-foreground"
            >
                <Icon class="size-4" />
                {tab.name}
            </Link>
        {/each}
    </nav>

    {#if active}
        {@const Tab = active.component}
        <Tab />
    {:else}
        <NotFound backTo="/account/security" />
    {/if}
</div>
