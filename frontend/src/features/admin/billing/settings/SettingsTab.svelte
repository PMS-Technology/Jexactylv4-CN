<script lang="ts">
    import { ArrowUpDown, ArrowLeftRight, CircleDollarSign, Download, Gavel, KeyRound, Power, Upload } from '@lucide/svelte';
    import { useQueryClient } from '@tanstack/svelte-query';
    import { adminBillingKeys, deleteStripeKeys, exportBillingConfig, updateBillingSetting } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import ConfirmDialog from '$lib/ui/dialog/ConfirmDialog.svelte';
    import Alert from '$lib/components/Alert.svelte';
    import { currencies } from '../currency';
    import ImportConfigDialog from './ImportConfigDialog.svelte';
    import StripeKeyDialog from './StripeKeyDialog.svelte';

    /**
     * Billing settings, ported from SettingsContainer.tsx and BillingLinksForm.tsx. The
     * legacy page reloaded after deleting keys and toggling the module; flags are patched
     * in place here.
     */
    const billing = $derived(app.flags!.billing);
    const queryClient = useQueryClient();

    let busy = $state<string | null>(null);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    async function run(key: string, task: () => Promise<void>, success?: string) {
        busy = key;
        notice = null;
        try {
            await task();
            if (success) notice = { variant: 'success', text: success };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            busy = null;
        }
    }

    const patch = (values: Partial<typeof billing>) => app.updateFlags({ billing: { ...app.flags!.billing, ...values } });

    // --- Currency. Code and symbol are separate settings, saved one after the other.
    let currency = $state(app.flags!.billing.currency.code.toUpperCase());

    const changeCurrency = (code: string) =>
        run(
            'currency',
            async () => {
                const symbol = currencies[code]!.symbol;
                await updateBillingSetting('currency:code', code);
                await updateBillingSetting('currency:symbol', symbol);
                patch({ currency: { code, symbol } });
            },
            `主要货币已改为 ${code}。`,
        ).then(() => (currency = app.flags!.billing.currency.code.toUpperCase()));

    const toggleUpgrades = () =>
        run('upgrades', async () => {
            await updateBillingSetting('allow_upgrades', !billing.allow_upgrades);
            patch({ allow_upgrades: !billing.allow_upgrades });
        });

    // --- Legal links. Both are sent together: the legacy form started empty and saved
    // both fields, so filling in one wiped the other (an empty value is stored as '').
    let terms = $state(app.flags!.billing.links.terms ?? '');
    let privacy = $state(app.flags!.billing.links.privacy ?? '');
    const isUrl = (v: string) => !v.trim() || /^https?:\/\/\S+$/i.test(v.trim());

    const saveLinks = (event: SubmitEvent) => {
        event.preventDefault();
        if (!isUrl(terms) || !isUrl(privacy)) return;
        void run(
            'links',
            async () => {
                await updateBillingSetting('links:terms', terms.trim());
                await updateBillingSetting('links:privacy', privacy.trim());
                patch({ links: { terms: terms.trim(), privacy: privacy.trim() } });
            },
            '法律文档链接已保存。',
        );
    };

    let stripeOpen = $state(false);
    let resetKeysOpen = $state(false);
    let importOpen = $state(false);
    let disableOpen = $state(false);

    const resetKeys = async () => {
        await deleteStripeKeys();
        patch({ keys: { secret: false } });
    };

    const disable = async () => {
        await updateBillingSetting('enabled', false);
        patch({ enabled: false });
    };
</script>

<StripeKeyDialog bind:open={stripeOpen} />
<ImportConfigDialog
    bind:open={importOpen}
    onImported={() => {
        notice = { variant: 'success', text: '导入完成。' };
        void queryClient.invalidateQueries({ queryKey: adminBillingKeys.all });
    }}
/>
<ConfirmDialog bind:open={resetKeysOpen} title="删除 Stripe API 密钥" confirmLabel="删除密钥" onConfirm={resetKeys}>
    删除后，购买和续费等所有计费功能都会停止工作，直到重新填写新的密钥。确定继续吗？
</ConfirmDialog>
<ConfirmDialog bind:open={disableOpen} title="停用计费模块" confirmLabel="停用" onConfirm={disable}>
    停用后，用户无法购买或续费服务器。请确认这不会影响到你的用户。已有的商品、订单和设置会保留。
</ConfirmDialog>

{#if notice}<Alert variant={notice.variant} class="mb-4">{notice.text}</Alert>{/if}

<div class="grid gap-4 lg:grid-cols-3">
    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><CircleDollarSign class="size-4" />主要货币</CardTitle></CardHeader>
        <CardContent class="space-y-1.5 text-sm">
            <p class="text-muted-foreground">选择向用户收费时使用的货币。</p>
            <Label for="billing-currency">货币代码 / 名称</Label>
            <select
                id="billing-currency"
                value={currency}
                disabled={!app.can('billing.update') || busy === 'currency'}
                onchange={e => changeCurrency(e.currentTarget.value)}
                class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            >
                {#if !currencies[currency]}<option value={currency}>{currency}</option>{/if}
                {#each Object.entries(currencies) as [code, c] (code)}
                    <option value={code}>{code} - {c.name}</option>
                {/each}
            </select>
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><ArrowUpDown class="size-4" />允许自助升降级</CardTitle></CardHeader>
        <CardContent class="space-y-3 text-sm">
            <p class="text-muted-foreground">
                开启后，用户可以在同一分类内升级或降级到其他套餐。如果在续期前升级，系统会生成一笔差价账单。变更后 30 天内不能再次更换套餐，以防滥用。
            </p>
            <p>
                当前状态：<span class={billing.allow_upgrades ? 'text-success' : 'text-destructive'}>{billing.allow_upgrades ? '已开启' : '已关闭'}</span>
            </p>
            {#if app.can('billing.update')}
                <div class="text-right">
                    <Button variant="outline" size="sm" loading={busy === 'upgrades'} onclick={toggleUpgrades}>
                        {billing.allow_upgrades ? '关闭' : '开启'}
                    </Button>
                </div>
            {/if}
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><ArrowLeftRight class="size-4" />导入 / 导出配置</CardTitle></CardHeader>
        <CardContent class="space-y-3 text-sm">
            <p class="text-muted-foreground">导出当前的分类和商品，或导入一份预先准备好的配置。</p>
            <div class="flex justify-end gap-2">
                {#if app.can('billing.export')}
                    <Button variant="outline" size="sm" loading={busy === 'export'} onclick={() => run('export', exportBillingConfig)}>
                        <Download />导出
                    </Button>
                {/if}
                {#if app.can('billing.import')}
                    <Button variant="outline" size="sm" onclick={() => (importOpen = true)}><Upload />导入</Button>
                {/if}
            </div>
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><KeyRound class="size-4" />Stripe API 密钥</CardTitle></CardHeader>
        <CardContent class="space-y-3 text-sm">
            {#if !billing.keys.secret}
                <p class="text-muted-foreground">没有 Stripe API 密钥时计费系统无法工作。用户可以进入结账页面，但在填写有效密钥之前都会报错。</p>
                {#if app.can('billing.update')}
                    <div class="text-right"><Button size="sm" onclick={() => (stripeOpen = true)}>填写 API 密钥</Button></div>
                {/if}
            {:else}
                <p class="text-muted-foreground">已保存 Stripe Secret Key。删除后，所有计费功能（例如购买或续费）都会停止，直到填写新的密钥。</p>
                {#if app.can('billing.delete-keys')}
                    <div class="text-right"><Button variant="destructive" size="sm" onclick={() => (resetKeysOpen = true)}>删除 API 密钥</Button></div>
                {/if}
            {/if}
        </CardContent>
    </Card>

    <Card>
        <CardHeader><CardTitle class="flex items-center gap-2"><Gavel class="size-4" />法律文档链接</CardTitle></CardHeader>
        <CardContent>
            <form class="space-y-3 text-sm" onsubmit={saveLinks}>
                <p class="text-muted-foreground">用户下单前必须同意的服务条款和隐私政策链接。留空则不显示。</p>
                <div class="space-y-1.5">
                    <Label for="billing-terms">服务条款 URL</Label>
                    <Input id="billing-terms" type="url" bind:value={terms} placeholder="https://…" disabled={!app.can('billing.update')} error={isUrl(terms) ? undefined : '请输入以 http:// 或 https:// 开头的地址。'} />
                </div>
                <div class="space-y-1.5">
                    <Label for="billing-privacy">隐私政策 URL</Label>
                    <Input id="billing-privacy" type="url" bind:value={privacy} placeholder="https://…" disabled={!app.can('billing.update')} error={isUrl(privacy) ? undefined : '请输入以 http:// 或 https:// 开头的地址。'} />
                </div>
                {#if app.can('billing.update')}
                    <div class="text-right">
                        <Button type="submit" size="sm" loading={busy === 'links'} disabled={!isUrl(terms) || !isUrl(privacy)}>保存</Button>
                    </div>
                {/if}
            </form>
        </CardContent>
    </Card>

    {#if app.can('billing.update')}
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Power class="size-4" />停用计费模块</CardTitle></CardHeader>
            <CardContent class="space-y-3 text-sm">
                <p class="text-muted-foreground">停用计费系统的所有功能，包括服务器购买和续费。停用前请确认这不会影响到你的用户。</p>
                <div class="text-right"><Button variant="destructive" size="sm" onclick={() => (disableOpen = true)}>停用计费模块</Button></div>
            </CardContent>
        </Card>
    {/if}
</div>
