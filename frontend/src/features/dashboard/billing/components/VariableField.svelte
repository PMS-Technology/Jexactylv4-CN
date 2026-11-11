<script lang="ts">
    import type { EggVariable } from '$lib/api/definitions/server';
    import { Checkbox, Input, Label, Select } from '$lib/ui';

    /**
     * One editable egg variable, ported from `billing/order/VariableBox.tsx`. Values only
     * reach the order when the user changes them; the backend fills the rest from the egg
     * defaults (`getEnvironment`).
     */
    let { variable, onChange }: { variable: EggVariable; onChange: (value: string) => void } = $props();

    const id = $props.id();

    const booleanRules = ['boolean', 'in:0,1', 'in:1,0', 'in:true,false', 'in:false,true'];
    const isToggle = $derived(variable.rules.some(rule => booleanRules.includes(rule)));
    // String booleans use "true"/"false"; everything else uses "1"/"0".
    const usesWords = $derived(variable.rules.includes('string') || variable.rules.some(r => r.includes('true')));
    const options = $derived(
        variable.rules
            .find(rule => rule.startsWith('in:'))
            ?.slice(3)
            .split(',') ?? [],
    );

    const initial = $derived(variable.serverValue ?? variable.defaultValue ?? '');
    const truthy = $derived(initial === '1' || initial === 'true');

    const optionList = $derived(options.map(option => ({ value: option, label: option })));
</script>

<div class="rounded-md border border-border p-4">
    {#if isToggle}
        <div class="flex items-center justify-between gap-4">
            <span class="text-sm font-medium">{variable.name}</span>
            <Checkbox
                checked={truthy}
                onCheckedChange={on => {
                    onChange(usesWords ? String(on) : on ? '1' : '0');
                }}
                aria-label={variable.name}
            />
        </div>
    {:else if options.length}
        <Select
            {id}
            items={optionList}
            value={initial}
            onValueChange={value => onChange(value)}
            label={variable.name}
        />
    {:else}
        <Label for={id}>{variable.name}</Label>
        <Input
            {id}
            value={variable.serverValue ?? ''}
            placeholder={variable.defaultValue}
            oninput={e => onChange(e.currentTarget.value)}
        />
    {/if}
    {#if variable.description}
        <p class="mt-1.5 text-xs text-muted-foreground">{variable.description}</p>
    {/if}
</div>
