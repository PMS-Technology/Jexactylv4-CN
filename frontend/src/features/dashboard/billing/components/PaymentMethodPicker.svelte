<script lang="ts">
    import type { PaymentMethod } from '$lib/api/definitions/billing';
    import { RadioGroup } from 'bits-ui';
    import ChoiceCard from './ChoiceCard.svelte';

    /**
     * The payment methods the customer can pick from at checkout.
     *
     * The identifier of the picked method is what decides the flow, so it is what the
     * checkout sends back to the panel.
     */
    type Props = {
        methods: PaymentMethod[];
        /** The identifier of the picked method, or null while nothing is picked. */
        value: string | null;
        onChange: (identifier: string) => void;
    };

    let { methods, value, onChange }: Props = $props();
</script>

<RadioGroup.Root value={value ?? ''} onValueChange={onChange} aria-label="支付方式" class="grid gap-3 sm:grid-cols-2">
    {#each methods as method (method.identifier)}
        <ChoiceCard value={method.identifier}>
            <p class="flex items-center gap-2 font-medium">
                {#if method.icon}
                    <img src={method.icon} alt="" class="size-5 shrink-0 object-contain" />
                {/if}
                <span class="truncate">{method.name}</span>
            </p>
            {#if method.description}
                <p class="mt-0.5 text-xs text-muted-foreground">{method.description}</p>
            {/if}
        </ChoiceCard>
    {/each}
</RadioGroup.Root>
