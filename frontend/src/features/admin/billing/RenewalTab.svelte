<script lang="ts">
    import { CalendarDays, Clock } from '@lucide/svelte';
    import { updateBillingSetting } from '$lib/api/admin/billing';
    import { httpErrorToHuman } from '$lib/api/http';
    import { app } from '$lib/stores/app.svelte';
    import { Button, Card, CardContent, CardHeader, CardTitle } from '$lib/ui';
    import Input from '$lib/ui/Input.svelte';
    import Label from '$lib/ui/Label.svelte';
    import Alert from '$lib/components/Alert.svelte';

    /**
     * Renewal days and deletion threshold, ported from RenewalDatesContainer.tsx. The
     * legacy inputs used parseInt, so a cleared field was saved as NaN (stored as "NaN");
     * both values are checked as integers in range before saving.
     */
    let days = $state(String(app.flags!.billing.renewal.days ?? 30));
    let threshold = $state(String(app.flags!.billing.renewal.threshold ?? 7));
    let saving = $state(false);
    let notice = $state<{ variant: 'success' | 'destructive'; text: string } | null>(null);

    const intIn = (v: string, min: number, max: number) => /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max;
    const daysValid = $derived(intIn(days, 1, 365));
    const thresholdValid = $derived(intIn(threshold, 0, 90));
    const canUpdate = $derived(app.can('billing.update'));

    async function save(event: SubmitEvent) {
        event.preventDefault();
        if (!daysValid || !thresholdValid || saving) return;

        saving = true;
        notice = null;
        try {
            await updateBillingSetting('renewal:days', Number(days));
            await updateBillingSetting('renewal:threshold', Number(threshold));
            app.updateFlags({ billing: { ...app.flags!.billing, renewal: { days: Number(days), threshold: Number(threshold) } } });
            notice = { variant: 'success', text: '续期设置已保存。' };
        } catch (e) {
            notice = { variant: 'destructive', text: httpErrorToHuman(e) };
        } finally {
            saving = false;
        }
    }
</script>

<form onsubmit={save} class="space-y-4">
    {#if notice}<Alert variant={notice.variant}>{notice.text}</Alert>{/if}

    <div class="grid gap-4 lg:grid-cols-2">
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><CalendarDays class="size-4" />续期天数</CardTitle></CardHeader>
            <CardContent class="space-y-1.5 text-sm">
                <p class="text-muted-foreground">每次购买或续期后，计费服务器的有效期增加的天数，默认 30 天。</p>
                <Label for="renewal-days">天数</Label>
                <Input id="renewal-days" inputmode="numeric" bind:value={days} disabled={!canUpdate || saving} error={daysValid ? undefined : '请输入 1–365 之间的整数。'} />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle class="flex items-center gap-2"><Clock class="size-4" />删除宽限期</CardTitle></CardHeader>
            <CardContent class="space-y-1.5 text-sm">
                <p class="text-muted-foreground">计费服务器到期后，超过这么多天仍未续期就会被自动删除。</p>
                <Label for="renewal-threshold">天数</Label>
                <Input id="renewal-threshold" inputmode="numeric" bind:value={threshold} disabled={!canUpdate || saving} error={thresholdValid ? undefined : '请输入 0–90 之间的整数。'} />
            </CardContent>
        </Card>
    </div>

    {#if canUpdate}
        <div class="flex justify-end">
            <Button type="submit" loading={saving} disabled={!daysValid || !thresholdValid}>保存</Button>
        </div>
    {/if}
</form>
