import { app } from '$lib/stores/app.svelte';

/** Formats an amount in the store currency, e.g. `¥12.00 CNY`, matching the legacy `<Money>`. */
export function formatMoney(value: number): string {
    const currency = app.flags?.billing.currency;

    return `${currency?.symbol ?? ''}${value.toFixed(2)} ${(currency?.code ?? '').toUpperCase()}`.trim();
}

/** Applies a discount code the same way `DiscountService::handle` does. */
export function applyDiscount(price: number, code: { type: 'percentage' | 'numeric'; value: number } | null): number {
    if (!code) return price;

    return code.type === 'percentage' ? Math.max(0, price - (price * code.value) / 100) : Math.max(0, price - code.value);
}
