<script lang="ts">
    import { app } from '$lib/stores/app.svelte';
    import { router } from '$lib/router/router.svelte';
    import NotFound from '$lib/components/NotFound.svelte';
    import CheckpointPage from './CheckpointPage.svelte';
    import ForgotPasswordPage from './ForgotPasswordPage.svelte';
    import LoginPage from './LoginPage.svelte';
    import RegisterPage from './RegisterPage.svelte';
    import ResetPasswordPage from './ResetPasswordPage.svelte';

    /**
     * Signed-out pages under /auth, ported from AuthenticationRouter.tsx. Laravel's guest
     * middleware keeps signed-in users out of these paths.
     */
    const path = $derived(router.pathname.replace(/\/+$/, ''));
    const resetToken = $derived(/^\/auth\/password\/reset\/([^/]+)$/.exec(path)?.[1] ?? null);
</script>

{#if path === '/auth/login' || path === '/auth'}
    {#key path}<LoginPage />{/key}
{:else if path === '/auth/login/checkpoint'}
    <CheckpointPage />
{:else if path === '/auth/register' && app.flags?.auth.registration.enabled}
    <RegisterPage />
{:else if path === '/auth/password'}
    <ForgotPasswordPage />
{:else if resetToken}
    <ResetPasswordPage token={decodeURIComponent(resetToken)} />
{:else}
    <div class="flex min-h-screen items-center justify-center p-6"><NotFound backTo="/auth/login" backLabel="返回登录" /></div>
{/if}
