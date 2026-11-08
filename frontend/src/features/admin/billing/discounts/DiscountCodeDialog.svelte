<script lang="ts">
    import { createDiscountCode, updateDiscountCode, type AdminDiscountCode, type DiscountCodeType } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { cn } from '$lib/utils/cn';
    import { Button } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Switch from '$lib/ui/Switch.svelte';
    import Dialog from '$lib/ui/dialog/Dialog.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Create/edit dialog, ported from discounts/DiscountCodeDialog.tsx. Differences from
     * the legacy dialog: the type toggle starts on the code's own type (it always showed
     * "percentage"); `active` is read from the code (the API never returned it, so saving
     * an edit re-activated disabled codes); an empty uses field means unlimited (it was
     * sent as 0, which DiscountCode::hasUsesRemaining treats as used up); errors are shown
     * and the table refreshes after saving.
     */
    type Props = { open?: boolean; code: AdminDiscountCode | null; onSaved: () => Promise<unknown> };
    let { open = $bindable(false), code, onSaved }: Props = $props();

    let value = $state('');
    let name = $state('');
    let description = $state('');
    let type = $state<DiscountCodeType>('percentage');
    let uses = $state('');
    let active = $state(true);
    let expiresAt = $state('');
    let saving = $state(false);
    let error = $state('');

    $effect(() => {
        if (!open) return;
        name = code?.code ?? '';
        description = code?.description ?? '';
        type = code?.type ?? 'percentage';
        value = String(code?.value ?? 25);
        uses = code?.uses === null || code?.uses === undefined || code.uses < 0 ? (code ? '' : '100') : String(code.uses);
        active = code?.active ?? true;
        expiresAt = code?.expiresAt ?? '';
        error = '';
    });

    const symbol = $derived(app.flags?.billing.currency.symbol ?? '$');
    const isInt = (v: string) => /^\d+$/.test(v.trim());

    // DiscountCode::$validationRules: code 4–16, description ≥ 3, value int ≥ 0, uses int.
    const errors = $derived({
        code: name.trim().length < 4 || name.trim().length > 16 ? '优惠码需要 4–16 个字符。' : undefined,
        description: description.trim().length < 3 ? '描述至少 3 个字符。' : undefined,
        value: !isInt(value)
            ? '请输入不小于 0 的整数。'
            : type === 'percentage' && Number(value) > 100
              ? '百分比折扣不能超过 100。'
              : undefined,
        uses: uses.trim() && !isInt(uses) ? '请输入不小于 0 的整数，留空表示不限次数。' : undefined,
    });
    const valid = $derived(!Object.values(errors).some(Boolean));

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid || saving) return;

        saving = true;
        error = '';
        const values = {
            code: name.trim(),
            description: description.trim(),
            type,
            value: Number(value),
            uses: uses.trim() ? Number(uses) : null,
            active,
            expires_at: expiresAt || null,
        };
        try {
            if (code) await updateDiscountCode(code.id, values);
            else await createDiscountCode(values);
            await onSaved();
            open = false;
        } catch (e) {
            error = httpErrorToHuman(e);
        } finally {
            saving = false;
        }
    }
</script>

<Dialog bind:open title={code ? '编辑优惠码' : '新建优惠码'} preventClose={saving} class="sm:max-w-xl">
    <form id="discount-form" class="space-y-5 text-sm" onsubmit={submit}>
        {#if error}<Alert variant="destructive">{error}</Alert>{/if}

        <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Label for="discount-code">优惠码</Label>
                <Input id="discount-code" bind:value={name} placeholder="SAVE25" class="font-mono" disabled={saving} error={name ? errors.code : undefined} />
                <p class="text-xs text-muted-foreground">用户结账时输入的代码。</p>
            </div>
            <div class="space-y-1.5">
                <Label for="discount-expires">到期日期</Label>
                <Input id="discount-expires" type="date" bind:value={expiresAt} disabled={saving} />
                <p class="text-xs text-muted-foreground">可选。到达该日期后优惠码失效。</p>
            </div>
        </div>
        <div class="space-y-1.5">
            <Label for="discount-description">描述</Label>
            <Input id="discount-description" bind:value={description} placeholder="全部商品立减 25%" disabled={saving} error={description ? errors.description : undefined} />
        </div>

        <div class="space-y-1.5">
            <span class="text-sm font-medium">折扣类型</span>
            <div class="grid grid-cols-2 overflow-hidden rounded-md border border-input" role="radiogroup" aria-label="折扣类型">
                {#each [{ value: 'percentage', label: '按百分比 (%)' }, { value: 'numeric', label: `固定金额 (${symbol})` }] as option (option.value)}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={type === option.value}
                        disabled={saving}
                        onclick={() => (type = option.value as DiscountCodeType)}
                        class={cn('px-3 py-2 font-medium transition-colors', type === option.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}
                    >
                        {option.label}
                    </button>
                {/each}
            </div>
            <p class="text-xs text-muted-foreground">按原价打折，或从原价中减去固定金额。</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
                <Label for="discount-value">折扣值（{type === 'percentage' ? '%' : symbol}）</Label>
                <Input id="discount-value" inputmode="numeric" bind:value disabled={saving} error={errors.value} />
            </div>
            <div class="space-y-1.5">
                <Label for="discount-uses">剩余次数</Label>
                <Input id="discount-uses" inputmode="numeric" bind:value={uses} placeholder="不限" disabled={saving} error={errors.uses} />
                <p class="text-xs text-muted-foreground">每用一次减 1，为 0 时失效。留空表示不限次数。</p>
            </div>
        </div>

        <label class="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3">
            <span>
                <span class="font-medium">启用</span>
                <span class="block text-xs text-muted-foreground">关闭后用户无法使用这个优惠码。</span>
            </span>
            <Switch bind:checked={active} aria-label="启用优惠码" disabled={saving} />
        </label>
    </form>

    {#snippet footer()}
        <Button variant="ghost" size="sm" disabled={saving} onclick={() => (open = false)}>取消</Button>
        <Button type="submit" form="discount-form" size="sm" loading={saving} disabled={!valid}>{code ? '保存' : '创建'}</Button>
    {/snippet}
</Dialog>
