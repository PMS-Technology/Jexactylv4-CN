<script lang="ts">
    import { fly } from 'svelte/transition';
    import { X } from '@lucide/svelte';
    import { app } from '$lib/stores/app.svelte';
    import type { AlertType } from '$types/bootstrap';
    import Alert from '$lib/components/Alert.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Button from '$lib/ui/button/Button.svelte';
    import type { ButtonVariant } from '$lib/ui/button/variants';

    /**
     * Admin-configured site announcement (admin → modules → Alerts), injected through
     * `window.EverestConfiguration.alert`. Regenerating the alert in the admin area
     * changes its uuid, which re-shows the center dialog to everyone.
     *
     * The legacy component only mounted on the servers page; here it lives in
     * DashboardArea, so it stays visible across every page of the client area.
     */
    const alert = $derived(app.flags?.alert);

    /** `danger` is called `destructive` by the shared Alert component. */
    const bannerVariants: Record<AlertType, 'info' | 'success' | 'warning' | 'destructive'> = {
        success: 'success',
        info: 'info',
        warning: 'warning',
        danger: 'destructive',
    };

    const pillStyles: Record<AlertType, string> = {
        success: 'border-success/30 bg-success/10',
        info: 'border-border bg-muted/70',
        warning: 'border-warning/30 bg-warning/10',
        danger: 'border-destructive/30 bg-destructive/10',
    };

    const dialogButtons: Record<AlertType, ButtonVariant> = {
        success: 'default',
        info: 'default',
        warning: 'secondary',
        danger: 'destructive',
    };

    const dialogTitles: Record<AlertType, string> = {
        success: '成功',
        info: '信息',
        warning: '警告',
        danger: '危险',
    };

    // Same key and JSON encoding as the legacy usePersistedState, so a dismissal
    // carries over when switching between the two frontends.
    function dismissalKey(): string {
        return `alert_${alert?.uuid ?? ''}_${app.user?.uuid ?? ''}`;
    }

    function readCenterDismissed(): boolean {
        try {
            return JSON.parse(localStorage.getItem(dismissalKey()) ?? '') === false;
        } catch {
            return false;
        }
    }

    let centerDismissed = $state(readCenterDismissed());
    let centerOpen = $state(true);

    function dismissCenter() {
        centerDismissed = true;
        try {
            localStorage.setItem(dismissalKey(), 'false');
        } catch {
            // Private browsing; the dialog just returns next visit.
        }
    }

    // The floating pill only hides for the current visit, like the legacy MessageBox.
    let pillDismissed = $state(false);
</script>

{#if alert && alert.enabled}
    {#if alert.position === 'top-center'}
        <div class="mx-auto max-w-7xl px-6 pt-6 lg:px-8">
            <Alert variant={bannerVariants[alert.type]}>{alert.content}</Alert>
        </div>
    {:else if alert.position === 'bottom-left' || alert.position === 'bottom-right'}
        {#if !pillDismissed}
            <div
                class="fixed bottom-20 z-50 md:bottom-4 {alert.position === 'bottom-left'
                    ? 'left-4'
                    : 'right-4'}"
                transition:fly={{ y: 16, duration: 200 }}
            >
                <div
                    class="flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border px-4 py-2.5
                           text-sm text-foreground shadow-lg backdrop-blur-md {pillStyles[alert.type]}"
                    role="alert"
                >
                    <span class="min-w-0">{alert.content}</span>
                    <button
                        type="button"
                        aria-label="关闭公告"
                        class="inline-flex shrink-0 items-center justify-center text-muted-foreground
                               transition-transform duration-150 hover:rotate-90 hover:text-foreground"
                        onclick={() => (pillDismissed = true)}
                    >
                        <X class="size-4" />
                    </button>
                </div>
            </div>
        {/if}
    {:else if alert.position === 'center' && !centerDismissed}
        <Dialog
            bind:open={centerOpen}
            title={dialogTitles[alert.type]}
            onOpenChange={open => !open && dismissCenter()}
        >
            {alert.content}
            {#snippet footer()}
                <Button variant="ghost" size="sm" onclick={dismissCenter}>取消</Button>
                <Button variant={dialogButtons[alert.type]} size="sm" onclick={dismissCenter}>
                    知道了
                </Button>
            {/snippet}
        </Dialog>
    {/if}
{/if}
