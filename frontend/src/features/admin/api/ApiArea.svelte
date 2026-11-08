<script lang="ts">
    import { router } from '$lib/router/router.svelte';
    import { app } from '$lib/stores/app.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import ApiKeysPage from './ApiKeysPage.svelte';
    import NewApiKeyPage from './NewApiKeyPage.svelte';

    /** Application API, ported from ApplicationApiRouter.tsx. */
    const sub = $derived(router.pathname.replace(/^\/admin\/api\/?/, '').replace(/\/+$/, ''));
</script>

<svelte:head>
    <title>应用 API | {app.settings?.name ?? 'Panel'}</title>
</svelte:head>

<div class="mx-auto max-w-7xl p-6 lg:p-8">
    <PageHeader title="应用 API" description="创建和删除此面板的管理 API 密钥。" />

    {#if sub === ''}
        <ApiKeysPage />
    {:else if sub === 'new'}
        {#if app.can('api.create')}
            <NewApiKeyPage />
        {:else}
            <p class="text-sm text-destructive">你没有权限创建 API 密钥。</p>
        {/if}
    {:else}
        <NotFound backTo="/admin/api" />
    {/if}
</div>
