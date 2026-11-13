<script lang="ts">
    import { createPaymentMethod, updatePaymentMethod, type AdminPaymentMethod } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { Button, Input, Select } from '$lib/ui';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Create/edit dialog for a payment method.
     *
     * The identifier decides the flow: it is the channel's own identifier, optionally
     * followed by a colon and the method within that channel — `stripe` is Stripe
     * itself, `epay:wxpay` is the WeChat Pay method of the Epay channel. The dialog
     * builds that identifier from a channel and the method within it, so a typo cannot
     * produce an identifier that names no channel.
     */
    type Props = { open?: boolean; method: AdminPaymentMethod | null; onSaved: () => Promise<unknown> };
    let { open = $bindable(false), method, onSaved }: Props = $props();

    const CHANNELS = [
        { value: 'stripe', label: 'Stripe' },
        { value: 'epay', label: '易支付 (Epay)' },
        { value: 'creem', label: 'Creem' },
        { value: 'waffo', label: 'Waffo 聚合网关' },
        { value: 'waffo_pancake', label: 'Waffo Pancake MoR' },
    ];

    let channel = $state('stripe');
    let subtype = $state('');
    let name = $state('');
    let description = $state('');
    let icon = $state('');
    let enabled = $state(true);
    let sort = $state('0');
    let saving = $state(false);
    let error = $state('');

    $effect(() => {
        if (!open) return;
        const identifier = method?.identifier ?? 'stripe';
        const [identifierChannel = 'stripe', identifierSubtype = ''] = identifier.split(':', 2);
        channel = identifierChannel;
        subtype = identifierSubtype;
        name = method?.name ?? '';
        description = method?.description ?? '';
        icon = method?.icon ?? '';
        enabled = method?.enabled ?? true;
        sort = String(method?.sort ?? 0);
        error = '';
    });

    /** The identifier the panel is given, built from the two parts. */
    const identifier = $derived(subtype.trim() ? `${channel}:${subtype.trim()}` : channel);

    // PaymentMethod::$validationRules: the identifier is lowercase with underscores, the
    // name cannot be empty and the sort is a whole number.
    const errors = $derived({
        identifier: !/^[a-z0-9_]+(:[a-z0-9_]+)?$/.test(identifier)
            ? '标识只能包含小写字母、数字和下划线，冒号后同理。'
            : undefined,
        name: name.trim().length === 0 ? '请填写名称。' : undefined,
        sort: !/^\d+$/.test(sort.trim()) ? '排序需要是不小于 0 的整数。' : undefined,
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        const values = {
            identifier,
            name: name.trim(),
            icon: icon.trim() || null,
            description: description.trim() || null,
            enabled,
            sort: Number(sort),
        };
        try {
            if (method) await updatePaymentMethod(method.id, values);
            else await createPaymentMethod(values);
            await onSaved();
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<Dialog bind:open title={method ? '编辑支付方式' : '新建支付方式'} preventClose={saving} class="sm:max-w-xl">
    <form id="payment-method-form" class="space-y-5 text-sm" onsubmit={submit}>
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}

        <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Select
                    id="payment-method-channel"
                    items={CHANNELS}
                    bind:value={channel}
                    disabled={saving}
                    label="支付渠道"
                />
                <p class="text-xs text-muted-foreground">用户选择这个支付方式时，款项走这个渠道。</p>
            </div>
            <div class="space-y-1.5">
                <Label for="payment-method-subtype">渠道内的支付方式</Label>
                <Input
                    id="payment-method-subtype"
                    bind:value={subtype}
                    placeholder="wxpay"
                    class="font-mono"
                    disabled={saving}
                />
                <p class="text-xs text-muted-foreground">
                    可选。易支付用它决定提交给网关的类型（wxpay、alipay 等）；其他渠道只有一个流程，填了也不会生效。
                </p>
            </div>
        </div>

        <div class="space-y-1.5">
            <Label for="payment-method-identifier">标识</Label>
            <Input id="payment-method-identifier" value={identifier} class="font-mono" disabled />
            <p class="text-xs text-muted-foreground">下单时提交给面板的就是这个标识，不能与其它支付方式重复。</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Label for="payment-method-name">名称</Label>
                <Input
                    id="payment-method-name"
                    bind:value={name}
                    placeholder="微信支付"
                    disabled={saving}
                    error={name ? errors.name : undefined}
                />
                <p class="text-xs text-muted-foreground">结账页上显示给用户的名称。</p>
            </div>
            <div class="space-y-1.5">
                <Label for="payment-method-icon">图标地址</Label>
                <Input
                    id="payment-method-icon"
                    bind:value={icon}
                    placeholder="https://…"
                    disabled={saving}
                />
                <p class="text-xs text-muted-foreground">可选，一张小图，显示在名称左边。</p>
            </div>
        </div>

        <div class="space-y-1.5">
            <Label for="payment-method-description">说明</Label>
            <Input
                id="payment-method-description"
                bind:value={description}
                placeholder="使用微信扫码付款。"
                disabled={saving}
            />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Label for="payment-method-sort">排序</Label>
                <Input
                    id="payment-method-sort"
                    inputmode="numeric"
                    bind:value={sort}
                    disabled={saving}
                    error={errors.sort}
                />
                <p class="text-xs text-muted-foreground">数字小的排在前面。</p>
            </div>
        </div>

        <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
            <span>
                <span class="font-medium">启用</span>
                <span class="block text-xs text-muted-foreground">关闭后用户在下单时看不到这个支付方式。</span>
            </span>
            <Switch bind:checked={enabled} aria-label="启用支付方式" disabled={saving} />
        </label>
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (open = false)}>取消</Button>
        <Button type="submit" form="payment-method-form" size="sm" loading={saving} disabled={!valid}>
            {method ? '保存' : '创建'}
        </Button>
    {/snippet}
</Dialog>
