<script lang="ts">
    import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
    import { app } from '$lib/stores/app.svelte';
    import { navigate, router } from '$lib/router/router.svelte';
    import DashboardArea from '$features/dashboard/DashboardArea.svelte';
    import ServerArea from '$features/server/ServerArea.svelte';
    import AdminArea from '$features/admin/AdminArea.svelte';
    import OnboardingDialog from '$features/dashboard/components/OnboardingDialog.svelte';
    import Spinner from '$lib/ui/Spinner.svelte';
    import { authState } from '$features/auth/state.svelte';

    /**
     * Query defaults: most of this data is server state that changes outside the UI
     * (server status, backups, nodes), so a short stale window plus refetch-on-focus
     * keeps lists current without refetching on every mount.
     */
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                gcTime: 5 * 60_000,
                retry: (failureCount, error) => {
                    const status = (error as { response?: { status?: number } })?.response?.status;
                    // A 4xx is a permission or validation failure; retrying cannot help.
                    if (status && status >= 400 && status < 500) return false;

                    return failureCount < 2;
                },
                refetchOnWindowFocus: true,
            },
        },
    });

    // /server/:id/* mounts get their own area with per-server state; the identifier
    // segment decides which server the store loads. Keying on it re-creates the whole
    // subtree when navigating between servers.
    const serverMatch = $derived(/^\/server\/([^/]+)(\/|$)/.exec(router.pathname));
    const serverId = $derived(serverMatch?.[1] ?? null);

    // Signed-out pages; Laravel's guest middleware only serves /auth to visitors.
    const isAuthPath = $derived(/^\/auth(\/|$)/.test(router.pathname));

    // Laravel serves `/`, /account and /server to guests as well; the legacy AuthenticatedRoute
    // sent them to sign in and back afterwards.
    const isGuest = $derived(app.initialized && !app.user && !isAuthPath);
    $effect(() => {
        if (!isGuest) return;
        authState.from = router.pathname + router.search + router.hash;
        navigate('/auth/login', { replace: true });
    });

    // Laravel only serves /admin to admins, but a client-side link can still land here.
    const isAdminPath = $derived(/^\/admin(\/|$)/.test(router.pathname) && app.isAdmin);
</script>

{#if !app.initialized}
    <Spinner centered />
{:else if isAuthPath}
    {#await import('$features/auth/AuthArea.svelte')}
        <Spinner centered />
    {:then { default: AuthArea }}
        <AuthArea />
    {/await}
{:else if isGuest}
    <Spinner centered />
{:else if app.isSuspended}
    <!-- Matches the legacy behaviour: a suspended account gets a notice and no app. -->
    <div class="flex min-h-screen items-center justify-center p-6">
        <div class="max-w-md text-center">
            <h1 class="text-lg font-semibold">账号已被停用</h1>
            <p class="mt-2 text-sm text-muted-foreground">你的账号已被管理员停用。</p>
        </div>
    </div>
{:else if app.needsSetup}
    <!-- Root admin on a panel that has not finished setup: the wizard replaces the app,
         checked before onboarding as in the legacy App.tsx. -->
    {#await import('$features/setup/SetupWizard.svelte')}
        <Spinner centered />
    {:then { default: SetupWizard }}
        <SetupWizard />
    {/await}
{:else if app.needsOnboarding}
    <!-- SSO account with a placeholder username: onboarding is the whole page, exactly
         like the legacy App.tsx branch. -->
    <OnboardingDialog />
{:else}
    <QueryClientProvider client={queryClient}>
        {#if serverId}
            {#key serverId}
                <ServerArea id={serverId} />
            {/key}
        {:else if isAdminPath}
            <AdminArea />
        {:else}
            <DashboardArea />
        {/if}
    </QueryClientProvider>
{/if}
