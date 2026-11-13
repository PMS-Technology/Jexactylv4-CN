<script lang="ts">
    import { Check, CircleAlert, Trash2 } from '@lucide/svelte';
    import { deletePaymentChannel, updatePaymentChannel, type PaymentChannel } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * One payment channel: the credentials it needs.
     *
     * Several channels can be set up at the same time; which of them a purchase goes
     * through is decided by the payment method the customer picked, not by a channel
     * being switched on here.
     *
     * The secret credentials are never sent to the browser, so the form starts empty and
     * only the keys that were saved are shown as "already set". Leaving a secret blank
     * keeps the one that is stored.
     */
    type Props = {
        channel: PaymentChannel;
        onSaved?: () => void;
    };

    let { channel, onSaved }: Props = $props();

    /** The labels for the credential fields, keyed by the setting name. */
    const FIELD_LABELS: Record<string, string> = {
        secret: 'Secret Key',
        pid: '商户 ID (PID)',
        key: '商户密钥 (Key)',
        gateway_url: '网关地址',
        api_key: 'API Key',
        webhook_secret: 'Webhook 密钥',
        merchant_id: '商户 ID (MID)',
        private_key: '商户私钥 (RSA)',
        public_key: '平台公钥 (RSA)',
    };

    const FIELD_HINTS: Record<string, string> = {
        secret: 'Stripe 面板中的 Secret Key，以 sk_ 开头。',
        pid: '易支付平台分配给你的商户 ID。',
        key: '易支付平台的商户密钥，用于签名。',
        gateway_url: '易支付网关地址，例如 https://pay.example.com',
        api_key: '在开发者页面获取的 API Key。',
        webhook_secret: 'Webhook 签名密钥，用于验证付款通知。',
        merchant_id: '平台分配给你的商户 ID。',
        private_key: '你生成的 RSA 私钥，用于签名请求。',
        public_key: '平台提供的 RSA 公钥，用于验证签名。',
    };

    const FIELD_TYPES: Record<string, string> = {
        gateway_url: 'url',
    };

    /**
     * The credentials being typed in. Every key the channel needs starts out empty, so
     * a two-way binding never points at a missing key.
     *
     * The list is built once: the card is keyed by channel, so a different channel
     * gets a new card rather than a reset one.
     */
    let values = $state<Record<string, string>>(Object.fromEntries(channel.required_keys.map(key => [key, ''])));
    let saving = $state(false);
    let error = $state('');
    let notice = $state('');

    const canUpdate = $derived(app.can('billing.update'));
    const canDeleteKeys = $derived(app.can('billing.delete-keys'));

    /** The credentials that have been saved already. */
    const savedKeys = $derived(channel.configured ? channel.required_keys : []);

    function fieldType(key: string): string {
        return FIELD_TYPES[key] ?? 'text';
    }

    async function save() {
        if (saving) return;

        saving = true;
        error = '';
        notice = '';
        try {
            const payload: Record<string, string> = {};

            for (const key of channel.required_keys) {
                const value = values[key]?.trim();
                // A blank secret keeps the one that is stored; the browser never sees it,
                // so there is nothing to send back.
                if (value) payload[key] = value;
            }

            await updatePaymentChannel(channel.id, payload);
            values = {};
            notice = '凭证已保存。';
            onSaved?.();
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }

    async function reset() {
        if (saving) return;

        saving = true;
        error = '';
        notice = '';
        try {
            await deletePaymentChannel(channel.id);
            values = {};
            notice = '凭证已删除。';
            onSaved?.();
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<Card>
    <CardHeader>
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
                <CardTitle class="flex items-center gap-2">{channel.label}</CardTitle>
                <p class="mt-1 text-sm text-muted-foreground">{channel.description}</p>
            </div>
            {#if channel.configured}
                <span class="inline-flex shrink-0 items-center gap-1 text-xs text-success">
                    <Check class="size-3.5" />已配置
                </span>
            {:else}
                <span class="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <CircleAlert class="size-3.5" />未配置
                </span>
            {/if}
        </div>
    </CardHeader>

    <CardContent class="space-y-4">
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}
        {#if notice}<Alert variant="success">{notice}</Alert>{/if}

        <form class="space-y-3" onsubmit={e => { e.preventDefault(); void save(); }}>
            {#each channel.required_keys as key (key)}
                <div class="space-y-1.5">
                    <Label for="{channel.id}-{key}">{FIELD_LABELS[key] ?? key}</Label>
                    <Input
                        id="{channel.id}-{key}"
                        type={fieldType(key)}
                        bind:value={values[key]}
                        placeholder={channel.secret_keys.includes(key) ? '已保存，留空则不修改' : ''}
                        autocomplete="off"
                        disabled={!canUpdate || saving}
                        class={channel.secret_keys.includes(key) ? 'font-mono' : ''}
                    />
                    <p class="text-xs text-muted-foreground">
                        {FIELD_HINTS[key] ?? ''}
                        {#if channel.secret_keys.includes(key) && savedKeys.includes(key)}
                            <span class="ml-1 text-success">已保存</span>
                        {/if}
                    </p>
                </div>
            {/each}

            {#if canUpdate}
                <div class="flex justify-end">
                    <Button type="submit" size="sm" loading={saving}>保存凭证</Button>
                </div>
            {/if}
        </form>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <p class="text-xs text-muted-foreground">
                {#if channel.uses_callbacks}
                    这个渠道通过 Webhook 通知付款结果，请把回调地址填到平台后台：
                    <code class="font-mono">{channel.callback_url}</code>
                {:else}
                    这个渠道在用户付款后跳回面板确认结果。
                {/if}
            </p>

            <div class="flex gap-2">
                {#if canDeleteKeys && channel.configured}
                    <Button variant="ghost" size="sm" disabled={saving} onclick={() => void reset()}>
                        <Trash2 />删除凭证
                    </Button>
                {/if}
            </div>
        </div>
    </CardContent>
</Card>
